import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CashMovementType,
  CashSessionDto,
  CashSessionStatus,
  PaymentMethod,
} from '@restaurante/shared-types';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { round2, toNumber } from '../../common/utils/money.util';
import { OpenSessionDto } from './dto/open-session.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { CloseSessionDto } from './dto/close-session.dto';

type SessionWithMovements = Prisma.CashSessionGetPayload<{
  include: { movements: { include: { createdBy: { select: { name: true } } } }; openedBy: { select: { name: true } } };
}>;

const SESSION_INCLUDE = {
  movements: { include: { createdBy: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
  openedBy: { select: { name: true } },
} satisfies Prisma.CashSessionInclude;

@Injectable()
export class CashRegisterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private ensureRestaurant(restaurantId: string): void {
    if (!restaurantId) {
      throw new BadRequestException('No se ha seleccionado un local activo.');
    }
  }

  /** Sesión de caja abierta actual del local (o null si no hay ninguna). */
  async current(restaurantId: string): Promise<CashSessionDto | null> {
    this.ensureRestaurant(restaurantId);
    const session = await this.prisma.cashSession.findFirst({
      where: { status: CashSessionStatus.ABIERTA, restaurantId },
      include: SESSION_INCLUDE,
    });
    return session ? this.toDto(session) : null;
  }

  async open(
    dto: OpenSessionDto,
    actorId: string,
    restaurantId: string,
  ): Promise<CashSessionDto> {
    this.ensureRestaurant(restaurantId);
    const existing = await this.prisma.cashSession.findFirst({
      where: { status: CashSessionStatus.ABIERTA, restaurantId },
    });
    if (existing) {
      throw new BadRequestException('Ya existe una caja abierta en este local. Ciérrela antes de abrir otra.');
    }
    const session = await this.prisma.cashSession.create({
      data: {
        restaurantId,
        openingAmount: new Prisma.Decimal(dto.openingAmount),
        openedById: actorId,
      },
      include: SESSION_INCLUDE,
    });
    await this.audit.record({
      userId: actorId,
      action: 'CASH_OPENED',
      entity: 'CashSession',
      entityId: session.id,
      restaurantId,
      metadata: { openingAmount: dto.openingAmount },
    });
    return this.toDto(session);
  }

  async addMovement(
    dto: CreateMovementDto,
    actorId: string,
    restaurantId: string,
  ): Promise<CashSessionDto> {
    this.ensureRestaurant(restaurantId);
    const session = await this.requireOpenSession(restaurantId);
    await this.prisma.cashMovement.create({
      data: {
        sessionId: session.id,
        restaurantId,
        type: dto.type,
        amount: new Prisma.Decimal(dto.amount),
        description: dto.description,
        createdById: actorId,
      },
    });
    await this.audit.record({
      userId: actorId,
      action: 'CASH_MOVEMENT',
      entity: 'CashSession',
      entityId: session.id,
      restaurantId,
      metadata: { type: dto.type, amount: dto.amount, description: dto.description },
    });
    return (await this.current(restaurantId))!;
  }

  async close(
    dto: CloseSessionDto,
    actorId: string,
    restaurantId: string,
  ): Promise<CashSessionDto> {
    this.ensureRestaurant(restaurantId);
    const session = await this.requireOpenSession(restaurantId);
    const totals = await this.computeTotals(session, restaurantId);
    const difference = round2(dto.actualAmount - totals.expectedAmount);

    const updated = await this.prisma.cashSession.update({
      where: { id: session.id },
      data: {
        status: CashSessionStatus.CERRADA,
        expectedAmount: new Prisma.Decimal(totals.expectedAmount),
        actualAmount: new Prisma.Decimal(dto.actualAmount),
        difference: new Prisma.Decimal(difference),
        notes: dto.notes ?? null,
        closedAt: new Date(),
      },
      include: SESSION_INCLUDE,
    });
    await this.audit.record({
      userId: actorId,
      action: 'CASH_CLOSED',
      entity: 'CashSession',
      entityId: session.id,
      restaurantId,
      metadata: { expected: totals.expectedAmount, actual: dto.actualAmount, difference },
    });
    return this.toDto(updated);
  }

  /** Historial de sesiones cerradas del local (más recientes primero). */
  async history(limit: number, restaurantId: string): Promise<CashSessionDto[]> {
    this.ensureRestaurant(restaurantId);
    const sessions = await this.prisma.cashSession.findMany({
      where: { status: CashSessionStatus.CERRADA, restaurantId },
      include: SESSION_INCLUDE,
      orderBy: { closedAt: 'desc' },
      take: Math.min(limit, 200),
    });
    return Promise.all(sessions.map((s) => this.toDto(s)));
  }

  // ---- Helpers ----------------------------------------------------------

  private async requireOpenSession(restaurantId: string): Promise<SessionWithMovements> {
    const session = await this.prisma.cashSession.findFirst({
      where: { status: CashSessionStatus.ABIERTA, restaurantId },
      include: SESSION_INCLUDE,
    });
    if (!session) {
      throw new NotFoundException('No hay una caja abierta en este local.');
    }
    return session;
  }

  /**
   * Calcula los totales de la sesión:
   * esperado = apertura + ingresos − egresos + ventas en efectivo del periodo
   * (solo del local).
   */
  private async computeTotals(
    session: SessionWithMovements,
    restaurantId: string,
  ): Promise<{
    totalIncome: number;
    totalExpense: number;
    cashSales: number;
    expectedAmount: number;
  }> {
    const totalIncome = round2(
      session.movements
        .filter((m) => m.type === CashMovementType.INGRESO)
        .reduce((acc, m) => acc + toNumber(m.amount), 0),
    );
    const totalExpense = round2(
      session.movements
        .filter((m) => m.type === CashMovementType.EGRESO)
        .reduce((acc, m) => acc + toNumber(m.amount), 0),
    );

    const cashAgg = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        method: PaymentMethod.EFECTIVO,
        order: { restaurantId },
        createdAt: {
          gte: session.openedAt,
          ...(session.closedAt ? { lte: session.closedAt } : {}),
        },
      },
    });
    const cashSales = round2(toNumber(cashAgg._sum.amount ?? 0));

    const expectedAmount = round2(
      toNumber(session.openingAmount) + totalIncome - totalExpense + cashSales,
    );
    return { totalIncome, totalExpense, cashSales, expectedAmount };
  }

  private async toDto(session: SessionWithMovements): Promise<CashSessionDto> {
    const totals = await this.computeTotals(session, session.restaurantId);
    return {
      id: session.id,
      openingAmount: toNumber(session.openingAmount),
      expectedAmount: session.expectedAmount !== null ? toNumber(session.expectedAmount) : totals.expectedAmount,
      actualAmount: session.actualAmount !== null ? toNumber(session.actualAmount) : null,
      difference: session.difference !== null ? toNumber(session.difference) : null,
      status: session.status as CashSessionStatus,
      notes: session.notes,
      openedByName: session.openedBy.name,
      openedAt: session.openedAt.toISOString(),
      closedAt: session.closedAt ? session.closedAt.toISOString() : null,
      movements: session.movements.map((m) => ({
        id: m.id,
        type: m.type as CashMovementType,
        amount: toNumber(m.amount),
        description: m.description,
        createdByName: m.createdBy.name,
        createdAt: m.createdAt.toISOString(),
      })),
      cashSales: totals.cashSales,
      totalIncome: totals.totalIncome,
      totalExpense: totals.totalExpense,
    };
  }
}
