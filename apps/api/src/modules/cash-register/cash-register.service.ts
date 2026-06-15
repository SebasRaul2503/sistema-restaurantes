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

  /** Sesión de caja abierta actual (o null si no hay ninguna). */
  async current(): Promise<CashSessionDto | null> {
    const session = await this.prisma.cashSession.findFirst({
      where: { status: CashSessionStatus.ABIERTA },
      include: SESSION_INCLUDE,
    });
    return session ? this.toDto(session) : null;
  }

  async open(dto: OpenSessionDto, actorId: string): Promise<CashSessionDto> {
    const existing = await this.prisma.cashSession.findFirst({
      where: { status: CashSessionStatus.ABIERTA },
    });
    if (existing) {
      throw new BadRequestException('Ya existe una caja abierta. Ciérrela antes de abrir otra.');
    }
    const session = await this.prisma.cashSession.create({
      data: { openingAmount: new Prisma.Decimal(dto.openingAmount), openedById: actorId },
      include: SESSION_INCLUDE,
    });
    await this.audit.record({
      userId: actorId,
      action: 'CASH_OPENED',
      entity: 'CashSession',
      entityId: session.id,
      metadata: { openingAmount: dto.openingAmount },
    });
    return this.toDto(session);
  }

  async addMovement(dto: CreateMovementDto, actorId: string): Promise<CashSessionDto> {
    const session = await this.requireOpenSession();
    await this.prisma.cashMovement.create({
      data: {
        sessionId: session.id,
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
      metadata: { type: dto.type, amount: dto.amount, description: dto.description },
    });
    return (await this.current())!;
  }

  async close(dto: CloseSessionDto, actorId: string): Promise<CashSessionDto> {
    const session = await this.requireOpenSession();
    const totals = await this.computeTotals(session);
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
      metadata: { expected: totals.expectedAmount, actual: dto.actualAmount, difference },
    });
    return this.toDto(updated);
  }

  /** Historial de sesiones cerradas (más recientes primero). */
  async history(limit = 50): Promise<CashSessionDto[]> {
    const sessions = await this.prisma.cashSession.findMany({
      where: { status: CashSessionStatus.CERRADA },
      include: SESSION_INCLUDE,
      orderBy: { closedAt: 'desc' },
      take: Math.min(limit, 200),
    });
    return Promise.all(sessions.map((s) => this.toDto(s)));
  }

  // ---- Helpers ----------------------------------------------------------

  private async requireOpenSession(): Promise<SessionWithMovements> {
    const session = await this.prisma.cashSession.findFirst({
      where: { status: CashSessionStatus.ABIERTA },
      include: SESSION_INCLUDE,
    });
    if (!session) {
      throw new NotFoundException('No hay una caja abierta.');
    }
    return session;
  }

  /**
   * Calcula los totales de la sesión:
   * esperado = apertura + ingresos − egresos + ventas en efectivo del periodo.
   */
  private async computeTotals(session: SessionWithMovements): Promise<{
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
        createdAt: { gte: session.openedAt, ...(session.closedAt ? { lte: session.closedAt } : {}) },
      },
    });
    const cashSales = round2(toNumber(cashAgg._sum.amount));

    const expectedAmount = round2(
      toNumber(session.openingAmount) + totalIncome - totalExpense + cashSales,
    );
    return { totalIncome, totalExpense, cashSales, expectedAmount };
  }

  private async toDto(session: SessionWithMovements): Promise<CashSessionDto> {
    const totals = await this.computeTotals(session);
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
