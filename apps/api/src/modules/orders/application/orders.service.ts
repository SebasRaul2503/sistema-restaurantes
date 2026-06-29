import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  OrderDto,
  OrderItemStatus,
  OrderStatus,
  OrderSummaryDto,
  TableStatus,
} from '@restaurante/shared-types';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { ORDER_INCLUDE } from '../infrastructure/order-include';
import { isFullyPaid, toOrderDto, toOrderSummary } from '../domain/order-calculator';
import { CreateOrderDto } from '../presentation/dto/create-order.dto';
import { AddOrderItemDto } from '../presentation/dto/add-order-item.dto';
import { UpdateOrderItemDto } from '../presentation/dto/update-order-item.dto';
import { ReplaceItemDto } from '../presentation/dto/replace-item.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private ensureRestaurant(restaurantId: string): void {
    if (!restaurantId) {
      throw new BadRequestException('No se ha seleccionado un local activo.');
    }
  }

  // ---- Lectura ----------------------------------------------------------

  async findActive(restaurantId: string): Promise<OrderSummaryDto[]> {
    this.ensureRestaurant(restaurantId);
    const orders = await this.prisma.order.findMany({
      where: { status: OrderStatus.ABIERTA, restaurantId },
      include: ORDER_INCLUDE,
      orderBy: { openedAt: 'asc' },
    });
    return orders.map(toOrderSummary);
  }

  async findOne(id: string, restaurantId: string): Promise<OrderDto> {
    this.ensureRestaurant(restaurantId);
    const order = await this.getOrderOrThrow(id, restaurantId);
    return toOrderDto(order);
  }

  async findActiveByTable(tableId: string, restaurantId: string): Promise<OrderDto | null> {
    this.ensureRestaurant(restaurantId);
    const order = await this.prisma.order.findFirst({
      where: { tableId, status: OrderStatus.ABIERTA, restaurantId },
      include: ORDER_INCLUDE,
    });
    return order ? toOrderDto(order) : null;
  }

  // ---- Ciclo de vida del pedido ----------------------------------------

  async create(dto: CreateOrderDto, actorId: string, restaurantId: string): Promise<OrderDto> {
    this.ensureRestaurant(restaurantId);
    const table = await this.prisma.table.findFirst({
      where: { id: dto.tableId, restaurantId },
    });
    if (!table || !table.active) {
      throw new NotFoundException('Mesa no encontrada.');
    }
    if (table.status === TableStatus.FUERA_DE_SERVICIO) {
      throw new BadRequestException('La mesa está fuera de servicio.');
    }

    const existing = await this.prisma.order.findFirst({
      where: { tableId: dto.tableId, status: OrderStatus.ABIERTA, restaurantId },
    });
    if (existing) {
      throw new BadRequestException('La mesa ya tiene un pedido activo.');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          restaurantId,
          tableId: dto.tableId,
          notes: dto.notes ?? null,
          openedById: actorId,
        },
      });
      await tx.table.update({
        where: { id: dto.tableId },
        data: { status: TableStatus.OCUPADA },
      });
      await this.audit.record(
        {
          userId: actorId,
          action: 'ORDER_CREATED',
          entity: 'Order',
          entityId: created.id,
          restaurantId,
          metadata: { tableId: dto.tableId },
        },
        tx,
      );
      return created;
    });

    return this.findOne(order.id, restaurantId);
  }

  async cancel(id: string, actorId: string, restaurantId: string): Promise<OrderDto> {
    this.ensureRestaurant(restaurantId);
    const order = await this.getOrderOrThrow(id, restaurantId);
    if (order.status !== OrderStatus.ABIERTA) {
      throw new BadRequestException('Solo se puede anular un pedido abierto.');
    }
    if (order.payments.length > 0) {
      throw new BadRequestException('No se puede anular un pedido con pagos registrados.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: OrderStatus.ANULADA, closedAt: new Date() },
      });
      await tx.table.update({ where: { id: order.tableId }, data: { status: TableStatus.LIBRE } });
      await this.audit.record(
        {
          userId: actorId,
          action: 'ORDER_CANCELLED',
          entity: 'Order',
          entityId: id,
          restaurantId,
        },
        tx,
      );
    });

    return this.findOne(id, restaurantId);
  }

  // ---- Ítems del pedido -------------------------------------------------

  async addItem(
    orderId: string,
    dto: AddOrderItemDto,
    actorId: string,
    restaurantId: string,
  ): Promise<OrderDto> {
    this.ensureRestaurant(restaurantId);
    const order = await this.getOrderOrThrow(orderId, restaurantId);
    this.assertOpen(order.status as OrderStatus);

    const dish = await this.prisma.dish.findFirst({
      where: { id: dto.dishId, restaurantId },
    });
    if (!dish || !dish.active) {
      throw new NotFoundException('Plato no encontrado o inactivo.');
    }

    const item = await this.prisma.orderItem.create({
      data: {
        orderId,
        dishId: dish.id,
        unitPrice: dish.price,
        quantity: dto.quantity,
        notes: dto.notes ?? null,
      },
    });
    await this.audit.record({
      userId: actorId,
      action: 'ITEM_ADDED',
      entity: 'OrderItem',
      entityId: item.id,
      restaurantId,
      metadata: { orderId, dish: dish.name, quantity: dto.quantity },
    });

    return this.findOne(orderId, restaurantId);
  }

  async updateItem(
    itemId: string,
    dto: UpdateOrderItemDto,
    actorId: string,
    restaurantId: string,
  ): Promise<OrderDto> {
    this.ensureRestaurant(restaurantId);
    const item = await this.prisma.orderItem.findFirst({
      where: {
        id: itemId,
        order: { restaurantId },
      },
      include: { order: true },
    });
    if (!item) {
      throw new NotFoundException('Plato del pedido no encontrado.');
    }
    this.assertOpen(item.order.status as OrderStatus);
    if (item.status === OrderItemStatus.ENTREGADO) {
      throw new BadRequestException(
        'No se puede modificar un plato entregado. Use la opción de reemplazo para corregirlo.',
      );
    }

    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        quantity: dto.quantity ?? item.quantity,
        notes: dto.notes !== undefined ? dto.notes : item.notes,
      },
    });
    await this.audit.record({
      userId: actorId,
      action: 'ITEM_UPDATED',
      entity: 'OrderItem',
      entityId: itemId,
      restaurantId,
      metadata: { orderId: item.orderId },
    });

    return this.findOne(item.orderId, restaurantId);
  }

  async removeItem(itemId: string, actorId: string, restaurantId: string): Promise<OrderDto> {
    this.ensureRestaurant(restaurantId);
    const item = await this.prisma.orderItem.findFirst({
      where: {
        id: itemId,
        order: { restaurantId },
      },
      include: { order: true },
    });
    if (!item) {
      throw new NotFoundException('Plato del pedido no encontrado.');
    }
    this.assertOpen(item.order.status as OrderStatus);
    if (item.status === OrderItemStatus.ENTREGADO) {
      throw new BadRequestException(
        'No se puede eliminar un plato entregado. Use la opción de reemplazo para corregirlo.',
      );
    }

    await this.prisma.orderItem.delete({ where: { id: itemId } });
    await this.audit.record({
      userId: actorId,
      action: 'ITEM_REMOVED',
      entity: 'OrderItem',
      entityId: itemId,
      restaurantId,
      metadata: { orderId: item.orderId, dishId: item.dishId },
    });

    return this.findOne(item.orderId, restaurantId);
  }

  /**
   * Protección de platos entregados: corrige un ítem ENTREGADO sin borrarlo.
   * Marca el original como modificado (excluido del total) y crea un reemplazo
   * en estado PREPARANDO enlazado por `replacesItemId`. Traza completa.
   */
  async replaceDeliveredItem(
    itemId: string,
    dto: ReplaceItemDto,
    actorId: string,
    restaurantId: string,
  ): Promise<OrderDto> {
    this.ensureRestaurant(restaurantId);
    const original = await this.prisma.orderItem.findFirst({
      where: {
        id: itemId,
        order: { restaurantId },
      },
      include: { order: true },
    });
    if (!original) {
      throw new NotFoundException('Plato del pedido no encontrado.');
    }
    this.assertOpen(original.order.status as OrderStatus);
    if (original.status !== OrderItemStatus.ENTREGADO) {
      throw new BadRequestException('El reemplazo solo aplica a platos ya entregados.');
    }
    if (original.isModified) {
      throw new BadRequestException('Este plato ya fue corregido anteriormente.');
    }

    const replacementDishId = dto.dishId ?? original.dishId;
    const dish = await this.prisma.dish.findFirst({
      where: { id: replacementDishId, restaurantId },
    });
    if (!dish) {
      throw new NotFoundException('Plato de reemplazo no encontrado.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.update({ where: { id: itemId }, data: { isModified: true } });
      const replacement = await tx.orderItem.create({
        data: {
          orderId: original.orderId,
          dishId: dish.id,
          unitPrice: dish.price,
          quantity: dto.quantity ?? original.quantity,
          notes: dto.notes ?? original.notes,
          status: OrderItemStatus.PREPARANDO,
          replacesItemId: original.id,
        },
      });
      await this.audit.record(
        {
          userId: actorId,
          action: 'ITEM_REPLACED',
          entity: 'OrderItem',
          entityId: original.id,
          restaurantId,
          metadata: {
            replacementId: replacement.id,
            reason: dto.reason ?? null,
            orderId: original.orderId,
          },
        },
        tx,
      );
    });

    return this.findOne(original.orderId, restaurantId);
  }

  // ---- Helpers compartidos ---------------------------------------------

  /**
   * Cierra el pedido si está totalmente pagado (libera la mesa). Pensado para
   * llamarse desde PaymentsService dentro de la misma transacción.
   */
  async closeIfFullyPaid(
    orderId: string,
    actorId: string,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
    if (!order || order.status !== OrderStatus.ABIERTA) {
      return false;
    }
    if (!isFullyPaid(order)) {
      return false;
    }
    await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CERRADA, closedAt: new Date() },
    });
    await tx.table.update({ where: { id: order.tableId }, data: { status: TableStatus.LIBRE } });
    await this.audit.record(
      {
        userId: actorId,
        action: 'ORDER_CLOSED',
        entity: 'Order',
        entityId: orderId,
        restaurantId: order.restaurantId,
      },
      tx,
    );
    return true;
  }

  private async getOrderOrThrow(id: string, restaurantId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, restaurantId },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }
    return order;
  }

  private assertOpen(status: OrderStatus): void {
    if (status !== OrderStatus.ABIERTA) {
      throw new BadRequestException('El pedido no está abierto.');
    }
  }
}
