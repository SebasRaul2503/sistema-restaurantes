import { Prisma } from '@prisma/client';

/**
 * Forma canónica de carga de un pedido con todo lo necesario para calcular su
 * estado financiero (ítems, grupos de cuenta, pagos). Reutilizada por orders,
 * billing y payments para evitar divergencias.
 */
export const ORDER_INCLUDE = {
  table: true,
  openedBy: { select: { name: true } },
  items: {
    include: { dish: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  },
  billGroups: {
    include: {
      items: {
        include: { orderItem: { include: { dish: { select: { name: true } } } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
  payments: {
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;
