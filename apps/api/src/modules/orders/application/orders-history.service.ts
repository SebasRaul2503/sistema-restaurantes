import { Injectable } from '@nestjs/common';
import { Prisma, OrderStatus, UserRole } from '@prisma/client';
import { PaginatedOrdersDto, OrderSummaryDto } from '@restaurante/shared-types';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ORDER_INCLUDE } from '../infrastructure/order-include';
import { toOrderSummary } from '../domain/order-calculator';

export interface OrdersHistoryFilter {
  /** ISO date YYYY-MM-DD (inclusive desde 00:00). */
  from?: string;
  /** ISO date YYYY-MM-DD (inclusive hasta 23:59:59.999). */
  to?: string;
  /** 'cerrados' (default), 'anulados', 'todos'. */
  status?: 'cerrados' | 'anulados' | 'todos';
  /** Búsqueda libre: code, table.number, dish.name, openedBy.name. */
  q?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class OrdersHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    restaurantId: string | null,
    filter: OrdersHistoryFilter,
    viewerRole: UserRole,
  ): Promise<PaginatedOrdersDto> {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, filter.pageSize ?? 50));

    const where: Prisma.OrderWhereInput = {};

    if (restaurantId) where.restaurantId = restaurantId;

    if (filter.status === 'anulados') {
      where.status = OrderStatus.ANULADA;
    } else if (filter.status === 'todos') {
      where.status = { in: [OrderStatus.CERRADA, OrderStatus.ANULADA] };
    } else {
      where.status = OrderStatus.CERRADA;
    }

    if (filter.from || filter.to) {
      where.closedAt = {};
      if (filter.from) {
        (where.closedAt as Prisma.DateTimeFilter).gte = new Date(`${filter.from}T00:00:00.000Z`);
      }
      if (filter.to) {
        (where.closedAt as Prisma.DateTimeFilter).lte = new Date(`${filter.to}T23:59:59.999Z`);
      }
    }

    if (filter.q && filter.q.trim().length > 0) {
      const term = filter.q.trim();
      const or: Prisma.OrderWhereInput[] = [
        { openedBy: { name: { contains: term, mode: 'insensitive' } } },
        { table: { number: { equals: isFinite(Number(term)) ? Number(term) : -1 } } },
        { items: { some: { dish: { name: { contains: term, mode: 'insensitive' } } } } },
      ];
      const codeNum = Number(term);
      if (Number.isFinite(codeNum)) or.push({ code: codeNum });
      where.OR = or;
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: [{ closedAt: 'desc' }, { code: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    void viewerRole; // parámetro reservado para reglas futuras (p. ej. ocultar totales a OPERATOR).

    return {
      items: orders.map(toOrderSummary),
      total,
      page,
      pageSize,
    };
  }
}
