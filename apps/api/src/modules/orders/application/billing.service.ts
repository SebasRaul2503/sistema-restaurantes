import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderDto, OrderStatus } from '@restaurante/shared-types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { ORDER_INCLUDE } from '../infrastructure/order-include';
import { orderTotal } from '../domain/order-calculator';
import { round2 } from '../../../common/utils/money.util';
import { OrdersService } from './orders.service';
import { CreateBillGroupDto } from '../presentation/dto/create-bill-group.dto';
import { SplitEvenDto } from '../presentation/dto/split-even.dto';
import { SplitItemsDto } from '../presentation/dto/split-items.dto';
import { AddGroupItemDto } from '../presentation/dto/add-group-item.dto';

/**
 * Gestión de la división de cuenta (split). Soporta:
 * - Partes iguales (montos fijos por grupo).
 * - Por ítems seleccionados (asignación de platos a grupos).
 * - Escenarios mixtos (grupos manuales + asignación parcial).
 */
@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly orders: OrdersService,
  ) {}

  async splitEven(orderId: string, dto: SplitEvenDto, actorId: string): Promise<OrderDto> {
    const order = await this.loadOpenOrder(orderId);
    this.assertNoPayments(order);

    const total = orderTotal(order);
    if (total <= 0) {
      throw new BadRequestException('El pedido no tiene consumo para dividir.');
    }

    const base = Math.floor((total / dto.parts) * 100) / 100;
    const amounts: number[] = Array.from({ length: dto.parts }, () => base);
    // El último grupo absorbe el redondeo para cuadrar el total exacto.
    amounts[dto.parts - 1] = round2(total - base * (dto.parts - 1));

    await this.prisma.$transaction(async (tx) => {
      await tx.billGroup.deleteMany({ where: { orderId } });
      for (let i = 0; i < dto.parts; i++) {
        await tx.billGroup.create({
          data: {
            orderId,
            name: dto.names?.[i]?.trim() || `Parte ${i + 1}`,
            fixedAmount: new Prisma.Decimal(amounts[i]),
          },
        });
      }
      await this.audit.record(
        { userId: actorId, action: 'BILL_SPLIT_EVEN', entity: 'Order', entityId: orderId, metadata: { parts: dto.parts, total } },
        tx,
      );
    });

    return this.orders.findOne(orderId);
  }

  async splitByItems(orderId: string, dto: SplitItemsDto, actorId: string): Promise<OrderDto> {
    const order = await this.loadOpenOrder(orderId);
    this.assertNoPayments(order);

    // Mapa de cantidades disponibles por ítem vigente (no modificado).
    const available = new Map<string, number>();
    for (const item of order.items) {
      if (!item.isModified) {
        available.set(item.id, item.quantity);
      }
    }

    // Validar que cada asignación exista y no exceda lo disponible.
    const consumed = new Map<string, number>();
    for (const group of dto.groups) {
      for (const assign of group.items) {
        if (!available.has(assign.orderItemId)) {
          throw new BadRequestException('Un ítem asignado no pertenece al pedido o fue corregido.');
        }
        const used = (consumed.get(assign.orderItemId) ?? 0) + assign.quantity;
        if (used > (available.get(assign.orderItemId) ?? 0)) {
          throw new BadRequestException('La cantidad asignada supera la cantidad del plato.');
        }
        consumed.set(assign.orderItemId, used);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.billGroup.deleteMany({ where: { orderId } });
      for (const group of dto.groups) {
        const created = await tx.billGroup.create({ data: { orderId, name: group.name.trim() } });
        for (const assign of group.items) {
          await tx.billGroupItem.create({
            data: { billGroupId: created.id, orderItemId: assign.orderItemId, quantity: assign.quantity },
          });
        }
      }
      await this.audit.record(
        { userId: actorId, action: 'BILL_SPLIT_ITEMS', entity: 'Order', entityId: orderId, metadata: { groups: dto.groups.length } },
        tx,
      );
    });

    return this.orders.findOne(orderId);
  }

  async createGroup(orderId: string, dto: CreateBillGroupDto, actorId: string): Promise<OrderDto> {
    const order = await this.loadOpenOrder(orderId);
    await this.prisma.billGroup.create({
      data: {
        orderId: order.id,
        name: dto.name.trim(),
        fixedAmount: dto.fixedAmount !== undefined ? new Prisma.Decimal(dto.fixedAmount) : null,
      },
    });
    await this.audit.record({ userId: actorId, action: 'BILL_GROUP_CREATED', entity: 'Order', entityId: orderId });
    return this.orders.findOne(orderId);
  }

  async addItemToGroup(groupId: string, dto: AddGroupItemDto, actorId: string): Promise<OrderDto> {
    const group = await this.prisma.billGroup.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Grupo de cuenta no encontrado.');
    }
    const item = await this.prisma.orderItem.findUnique({ where: { id: dto.orderItemId } });
    if (!item || item.orderId !== group.orderId || item.isModified) {
      throw new BadRequestException('El ítem no pertenece al pedido o fue corregido.');
    }
    await this.prisma.billGroupItem.upsert({
      where: { billGroupId_orderItemId: { billGroupId: groupId, orderItemId: dto.orderItemId } },
      create: { billGroupId: groupId, orderItemId: dto.orderItemId, quantity: dto.quantity },
      update: { quantity: dto.quantity },
    });
    await this.audit.record({ userId: actorId, action: 'BILL_GROUP_ITEM_ADDED', entity: 'BillGroup', entityId: groupId });
    return this.orders.findOne(group.orderId);
  }

  async removeGroupItem(groupItemId: string, actorId: string): Promise<OrderDto> {
    const groupItem = await this.prisma.billGroupItem.findUnique({
      where: { id: groupItemId },
      include: { billGroup: true },
    });
    if (!groupItem) {
      throw new NotFoundException('Asignación no encontrada.');
    }
    await this.prisma.billGroupItem.delete({ where: { id: groupItemId } });
    await this.audit.record({ userId: actorId, action: 'BILL_GROUP_ITEM_REMOVED', entity: 'BillGroup', entityId: groupItem.billGroupId });
    return this.orders.findOne(groupItem.billGroup.orderId);
  }

  async deleteGroup(groupId: string, actorId: string): Promise<OrderDto> {
    const group = await this.prisma.billGroup.findUnique({
      where: { id: groupId },
      include: { payments: true },
    });
    if (!group) {
      throw new NotFoundException('Grupo de cuenta no encontrado.');
    }
    if (group.payments.length > 0) {
      throw new BadRequestException('No se puede eliminar un grupo con pagos registrados.');
    }
    await this.prisma.billGroup.delete({ where: { id: groupId } });
    await this.audit.record({ userId: actorId, action: 'BILL_GROUP_DELETED', entity: 'Order', entityId: group.orderId });
    return this.orders.findOne(group.orderId);
  }

  async clearSplit(orderId: string, actorId: string): Promise<OrderDto> {
    const order = await this.loadOpenOrder(orderId);
    this.assertNoPayments(order);
    await this.prisma.billGroup.deleteMany({ where: { orderId } });
    await this.audit.record({ userId: actorId, action: 'BILL_SPLIT_CLEARED', entity: 'Order', entityId: orderId });
    return this.orders.findOne(orderId);
  }

  private async loadOpenOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }
    if (order.status !== OrderStatus.ABIERTA) {
      throw new BadRequestException('El pedido no está abierto.');
    }
    return order;
  }

  private assertNoPayments(order: { payments: unknown[] }): void {
    if (order.payments.length > 0) {
      throw new BadRequestException('No se puede cambiar la división con pagos ya registrados.');
    }
  }
}
