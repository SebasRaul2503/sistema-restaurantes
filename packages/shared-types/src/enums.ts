// Enumeraciones compartidas entre la API y la web.
// Deben mantenerse sincronizadas con `apps/api/prisma/schema.prisma`.

export enum UserRole {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
}

export enum TableStatus {
  LIBRE = 'LIBRE',
  OCUPADA = 'OCUPADA',
  RESERVADA = 'RESERVADA',
  FUERA_DE_SERVICIO = 'FUERA_DE_SERVICIO',
}

export enum OrderStatus {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
  ANULADA = 'ANULADA',
}

export enum OrderItemStatus {
  PENDIENTE = 'PENDIENTE',
  PREPARANDO = 'PREPARANDO',
  ENTREGADO = 'ENTREGADO',
}

export enum PaymentMethod {
  EFECTIVO = 'EFECTIVO',
  YAPE = 'YAPE',
  PLIN = 'PLIN',
  TARJETA = 'TARJETA',
}

export enum CashMovementType {
  INGRESO = 'INGRESO',
  EGRESO = 'EGRESO',
}

export enum CashSessionStatus {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
}
