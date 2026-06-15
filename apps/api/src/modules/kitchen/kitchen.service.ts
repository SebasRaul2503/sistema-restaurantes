import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  KitchenItemDto,
  OrderItemStatus,
  OrderStatus,
} from '@restaurante/shared-types';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Flujo de cocina. Expone la cola de preparación y las transiciones de estado
 * de cada plato (Pendiente → Preparando → Entregado).
 */
@Injectable()
export class KitchenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Cola de cocina: platos por preparar/entregar de pedidos abiertos (FIFO). */
  async queue(): Promise<KitchenItemDto[]> {
    const items = await this.prisma.orderItem.findMany({
      where: {
        isModified: false,
        status: { in: [OrderItemStatus.PENDIENTE, OrderItemStatus.PREPARANDO] },
        order: { status: OrderStatus.ABIERTA },
      },
      include: {
        dish: { select: { name: true } },
        order: { select: { code: true, table: { select: { number: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return items.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      orderCode: item.order.code,
      tableNumber: item.order.table.number,
      dishName: item.dish.name,
      quantity: item.quantity,
      notes: item.notes,
      status: item.status as OrderItemStatus,
      isReplacement: item.replacesItemId !== null,
      createdAt: item.createdAt.toISOString(),
    }));
  }

  /** Transición de estado de un plato con validación del flujo permitido. */
  async changeStatus(itemId: string, status: OrderItemStatus, actorId: string): Promise<KitchenItemDto> {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true },
    });
    if (!item) {
      throw new NotFoundException('Plato no encontrado.');
    }
    if (item.order.status !== OrderStatus.ABIERTA) {
      throw new BadRequestException('El pedido no está abierto.');
    }
    if (item.isModified) {
      throw new BadRequestException('Este plato fue corregido y ya no está en cocina.');
    }
    this.assertValidTransition(item.status as OrderItemStatus, status);

    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status,
        deliveredAt: status === OrderItemStatus.ENTREGADO ? new Date() : null,
      },
    });
    await this.audit.record({
      userId: actorId,
      action: 'ITEM_STATUS_CHANGED',
      entity: 'OrderItem',
      entityId: itemId,
      metadata: { from: item.status, to: status, orderId: item.orderId },
    });

    const updated = await this.prisma.orderItem.findUniqueOrThrow({
      where: { id: itemId },
      include: {
        dish: { select: { name: true } },
        order: { select: { code: true, table: { select: { number: true } } } },
      },
    });
    return {
      id: updated.id,
      orderId: updated.orderId,
      orderCode: updated.order.code,
      tableNumber: updated.order.table.number,
      dishName: updated.dish.name,
      quantity: updated.quantity,
      notes: updated.notes,
      status: updated.status as OrderItemStatus,
      isReplacement: updated.replacesItemId !== null,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  /**
   * Transiciones permitidas. Se admite avanzar al siguiente estado o retroceder
   * de Entregado a Preparando (corrección rápida sin reemplazo de plato).
   */
  private assertValidTransition(from: OrderItemStatus, to: OrderItemStatus): void {
    const allowed: Record<OrderItemStatus, OrderItemStatus[]> = {
      [OrderItemStatus.PENDIENTE]: [OrderItemStatus.PREPARANDO, OrderItemStatus.ENTREGADO],
      [OrderItemStatus.PREPARANDO]: [OrderItemStatus.ENTREGADO, OrderItemStatus.PENDIENTE],
      [OrderItemStatus.ENTREGADO]: [OrderItemStatus.PREPARANDO],
    };
    if (from !== to && !allowed[from].includes(to)) {
      throw new BadRequestException('Transición de estado no permitida.');
    }
  }
}
