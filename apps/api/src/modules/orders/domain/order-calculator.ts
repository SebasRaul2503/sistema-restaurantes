import {
  BillGroupDto,
  OrderDto,
  OrderItemDto,
  OrderItemStatus,
  OrderStatus,
  OrderSummaryDto,
  PaymentDto,
  PaymentMethod,
} from '@restaurante/shared-types';
import { round2, toNumber } from '../../../common/utils/money.util';
import { OrderWithRelations } from '../infrastructure/order-include';

/**
 * Lógica de cálculo financiero de un pedido. Funciones puras (sin NestJS ni
 * Prisma directo) — fáciles de testear de forma aislada.
 *
 * Reglas:
 * - Los ítems marcados como `isModified` (corrección de un plato entregado) se
 *   EXCLUYEN del total: representan un error de cocina que no se cobra.
 * - El total del pedido = suma de subtotales de ítems vigentes.
 * - Lo pagado = suma de todos los pagos. El saldo = total − pagado.
 * - Un grupo de cuenta (split) con `fixedAmount` debe ese monto; si no, debe la
 *   suma de los ítems que tiene asignados.
 */

function itemSubtotal(unitPrice: unknown, quantity: number): number {
  return round2(toNumber(unitPrice as number) * quantity);
}

export function mapOrderItem(item: OrderWithRelations['items'][number]): OrderItemDto {
  return {
    id: item.id,
    dishId: item.dishId,
    // Snapshot del nombre: si por alguna razón quedó null (registros antiguos
    // sin backfill), caemos al nombre actual del plato o a un placeholder.
    dishName: item.dishName ?? item.dish?.name ?? 'Plato eliminado',
    unitPrice: toNumber(item.unitPrice),
    quantity: item.quantity,
    notes: item.notes,
    status: item.status as OrderItemStatus,
    isModified: item.isModified,
    replacesItemId: item.replacesItemId,
    deliveredAt: item.deliveredAt ? item.deliveredAt.toISOString() : null,
    subtotal: itemSubtotal(item.unitPrice, item.quantity),
  };
}

function mapPayment(payment: OrderWithRelations['payments'][number]): PaymentDto {
  return {
    id: payment.id,
    orderId: payment.orderId,
    billGroupId: payment.billGroupId,
    method: payment.method as PaymentMethod,
    amount: toNumber(payment.amount),
    reference: payment.reference,
    createdByName: payment.createdBy.name,
    createdAt: payment.createdAt.toISOString(),
  };
}

/** Suma de pagos asociados a un grupo de cuenta concreto. */
function paidForGroup(order: OrderWithRelations, groupId: string): number {
  return round2(
    order.payments
      .filter((p) => p.billGroupId === groupId)
      .reduce((acc, p) => acc + toNumber(p.amount), 0),
  );
}

export function orderTotal(order: OrderWithRelations): number {
  return round2(
    order.items
      .filter((i) => !i.isModified)
      .reduce((acc, i) => acc + itemSubtotal(i.unitPrice, i.quantity), 0),
  );
}

export function orderPaid(order: OrderWithRelations): number {
  return round2(order.payments.reduce((acc, p) => acc + toNumber(p.amount), 0));
}

function mapBillGroup(order: OrderWithRelations, group: OrderWithRelations['billGroups'][number]): BillGroupDto {
  const items = group.items.map((gi) => ({
    id: gi.id,
    orderItemId: gi.orderItemId,
    dishName: gi.orderItem.dishName ?? gi.orderItem.dish?.name ?? 'Plato eliminado',
    unitPrice: toNumber(gi.orderItem.unitPrice),
    quantity: gi.quantity,
    subtotal: itemSubtotal(gi.orderItem.unitPrice, gi.quantity),
  }));

  const computedFromItems = round2(items.reduce((acc, i) => acc + i.subtotal, 0));
  const total = group.fixedAmount !== null ? toNumber(group.fixedAmount) : computedFromItems;
  const paid = paidForGroup(order, group.id);

  return {
    id: group.id,
    name: group.name,
    fixedAmount: group.fixedAmount !== null ? toNumber(group.fixedAmount) : null,
    items,
    total,
    paid,
    balance: round2(total - paid),
  };
}

export function activeItemCount(order: OrderWithRelations): number {
  return order.items.filter((i) => !i.isModified).reduce((acc, i) => acc + i.quantity, 0);
}

export function toOrderSummary(order: OrderWithRelations): OrderSummaryDto {
  const total = orderTotal(order);
  const paid = orderPaid(order);
  return {
    id: order.id,
    code: order.code,
    tableId: order.tableId,
    tableNumber: order.table.number,
    status: order.status as OrderStatus,
    itemCount: activeItemCount(order),
    total,
    paid,
    balance: round2(total - paid),
    openedAt: order.openedAt.toISOString(),
    closedAt: order.closedAt ? order.closedAt.toISOString() : null,
  };
}

export function toOrderDto(order: OrderWithRelations): OrderDto {
  const summary = toOrderSummary(order);
  return {
    ...summary,
    notes: order.notes,
    openedByName: order.openedBy.name,
    closedAt: order.closedAt ? order.closedAt.toISOString() : null,
    items: order.items.map(mapOrderItem),
    billGroups: order.billGroups.map((g) => mapBillGroup(order, g)),
    payments: order.payments.map(mapPayment),
  };
}

/** Indica si el pedido está totalmente pagado (con tolerancia de céntimo). */
export function isFullyPaid(order: OrderWithRelations): boolean {
  return orderPaid(order) + 0.01 >= orderTotal(order) && orderTotal(order) > 0;
}
