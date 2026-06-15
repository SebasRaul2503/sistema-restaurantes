import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrderDto, OrderStatus, PaymentDto, PaymentMethod } from '@restaurante/shared-types';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OrdersService } from '../orders/application/orders.service';
import { toNumber } from '../../common/utils/money.util';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly orders: OrdersService,
  ) {}

  /**
   * Registra un pago (parcial o combinado). Recalcula el saldo y, si el pedido
   * queda totalmente pagado, lo cierra y libera la mesa.
   */
  async register(orderId: string, dto: CreatePaymentDto, actorId: string): Promise<OrderDto> {
    const order = await this.orders.findOne(orderId);
    if (order.status !== OrderStatus.ABIERTA) {
      throw new BadRequestException('El pedido no está abierto.');
    }

    // El saldo de referencia es el del grupo (si es un pago dividido) o el global.
    let referenceBalance = order.balance;
    if (dto.billGroupId) {
      const group = order.billGroups.find((g) => g.id === dto.billGroupId);
      if (!group) {
        throw new BadRequestException('El grupo de cuenta no pertenece al pedido.');
      }
      referenceBalance = group.balance;
    }

    if (dto.amount > referenceBalance + 0.01) {
      throw new BadRequestException('El pago excede el saldo pendiente.');
    }

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          orderId,
          billGroupId: dto.billGroupId ?? null,
          method: dto.method,
          amount: new Prisma.Decimal(dto.amount),
          reference: dto.reference ?? null,
          createdById: actorId,
        },
      });
      await this.audit.record(
        {
          userId: actorId,
          action: 'PAYMENT_REGISTERED',
          entity: 'Payment',
          entityId: payment.id,
          metadata: { orderId, method: dto.method, amount: dto.amount },
        },
        tx,
      );
      await this.orders.closeIfFullyPaid(orderId, actorId, tx);
    });

    return this.orders.findOne(orderId);
  }

  async listByOrder(orderId: string): Promise<PaymentDto[]> {
    const payments = await this.prisma.payment.findMany({
      where: { orderId },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return payments.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      billGroupId: p.billGroupId,
      method: p.method as PaymentMethod,
      amount: toNumber(p.amount),
      reference: p.reference,
      createdByName: p.createdBy.name,
      createdAt: p.createdAt.toISOString(),
    }));
  }
}
