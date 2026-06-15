// Etiquetas en español para los enums. La capa de presentación las usa para
// mostrar texto al usuario; el almacenamiento permanece en los valores de enum.

import {
  CashMovementType,
  OrderItemStatus,
  OrderStatus,
  PaymentMethod,
  TableStatus,
  UserRole,
} from './enums';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.OPERATOR]: 'Mesero / Operador',
};

export const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  [TableStatus.LIBRE]: 'Libre',
  [TableStatus.OCUPADA]: 'Ocupada',
  [TableStatus.RESERVADA]: 'Reservada',
  [TableStatus.FUERA_DE_SERVICIO]: 'Fuera de servicio',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.ABIERTA]: 'Abierta',
  [OrderStatus.CERRADA]: 'Cerrada',
  [OrderStatus.ANULADA]: 'Anulada',
};

export const ORDER_ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  [OrderItemStatus.PENDIENTE]: 'Pendiente',
  [OrderItemStatus.PREPARANDO]: 'Preparando',
  [OrderItemStatus.ENTREGADO]: 'Entregado',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.EFECTIVO]: 'Efectivo',
  [PaymentMethod.YAPE]: 'Yape',
  [PaymentMethod.PLIN]: 'Plin',
  [PaymentMethod.TARJETA]: 'Tarjeta',
};

export const CASH_MOVEMENT_TYPE_LABELS: Record<CashMovementType, string> = {
  [CashMovementType.INGRESO]: 'Ingreso',
  [CashMovementType.EGRESO]: 'Egreso',
};
