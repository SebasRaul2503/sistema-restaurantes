import { Injectable } from '@nestjs/common';
import { OrderItemStatus, OrderStatus, TableStatus } from '@prisma/client';
import {
  DashboardDto,
  PaymentMethod,
  RevenueByMethodDto,
  RevenuePointDto,
  TopDishDto,
  TopTableDto,
} from '@restaurante/shared-types';
import { PrismaService } from '../../core/prisma/prisma.service';
import { round2, toNumber } from '../../common/utils/money.util';

type RevenuePeriod = 'daily' | 'weekly' | 'monthly';

/** Inicio del día actual (hora local del servidor). */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Inicio del mes actual (hora local del servidor). */
function startOfMonth(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------------------------------------------------
  // 1. Dashboard
  // -----------------------------------------------------------------------
  async dashboard(): Promise<DashboardDto> {
    const [
      tablesByStatus,
      activeOrders,
      itemsByStatus,
      revenueTodayAgg,
      revenueMonthAgg,
    ] = await Promise.all([
      this.prisma.table.groupBy({
        by: ['status'],
        where: { active: true },
        _count: { _all: true },
      }),
      this.prisma.order.count({ where: { status: OrderStatus.ABIERTA } }),
      this.prisma.orderItem.groupBy({
        by: ['status'],
        where: {
          isModified: false,
          order: { status: OrderStatus.ABIERTA },
        },
        _count: { _all: true },
      }),
      this.prisma.payment.aggregate({
        where: { createdAt: { gte: startOfToday() } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { createdAt: { gte: startOfMonth() } },
        _sum: { amount: true },
      }),
    ]);

    const tableCount = (status: TableStatus): number =>
      tablesByStatus.find((row) => row.status === status)?._count._all ?? 0;

    const itemCount = (status: OrderItemStatus): number =>
      itemsByStatus.find((row) => row.status === status)?._count._all ?? 0;

    return {
      tablesFree: tableCount(TableStatus.LIBRE),
      tablesOccupied: tableCount(TableStatus.OCUPADA),
      tablesReserved: tableCount(TableStatus.RESERVADA),
      tablesOutOfService: tableCount(TableStatus.FUERA_DE_SERVICIO),
      activeOrders,
      itemsPending: itemCount(OrderItemStatus.PENDIENTE),
      itemsPreparing: itemCount(OrderItemStatus.PREPARANDO),
      itemsDelivered: itemCount(OrderItemStatus.ENTREGADO),
      revenueToday: round2(toNumber(revenueTodayAgg._sum.amount)),
      revenueMonth: round2(toNumber(revenueMonthAgg._sum.amount)),
    };
  }

  // -----------------------------------------------------------------------
  // 2. Ingresos por período
  // -----------------------------------------------------------------------
  async revenue(
    period: RevenuePeriod = 'daily',
    from?: string,
    to?: string,
  ): Promise<RevenuePointDto[]> {
    const { start, end } = this.resolveRevenueRange(period, from, to);

    const payments = await this.prisma.payment.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { amount: true, createdAt: true },
    });

    const buckets = new Map<string, number>();
    for (const payment of payments) {
      const key = this.bucketKey(payment.createdAt, period);
      buckets.set(key, (buckets.get(key) ?? 0) + toNumber(payment.amount));
    }

    return Array.from(buckets.entries())
      .map(([date, total]) => ({ date, total: round2(total) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // -----------------------------------------------------------------------
  // 3. Platos más vendidos
  // -----------------------------------------------------------------------
  async topDishes(from?: string, to?: string, limit = 10): Promise<TopDishDto[]> {
    const { start, end } = this.resolveRange(from, to);

    const items = await this.prisma.orderItem.findMany({
      where: {
        isModified: false,
        createdAt: { gte: start, lte: end },
      },
      select: {
        dishId: true,
        quantity: true,
        unitPrice: true,
        dish: { select: { name: true } },
      },
    });

    const map = new Map<string, TopDishDto>();
    for (const item of items) {
      const current =
        map.get(item.dishId) ??
        ({
          dishId: item.dishId,
          dishName: item.dish.name,
          quantity: 0,
          total: 0,
        } as TopDishDto);
      current.quantity += item.quantity;
      current.total += toNumber(item.unitPrice) * item.quantity;
      map.set(item.dishId, current);
    }

    return Array.from(map.values())
      .map((row) => ({ ...row, total: round2(row.total) }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);
  }

  // -----------------------------------------------------------------------
  // 4. Mesas con más facturación
  // -----------------------------------------------------------------------
  async topTables(from?: string, to?: string, limit = 10): Promise<TopTableDto[]> {
    const { start, end } = this.resolveRange(from, to);

    const orders = await this.prisma.order.findMany({
      where: { openedAt: { gte: start, lte: end } },
      select: {
        tableId: true,
        table: { select: { number: true } },
        payments: { select: { amount: true } },
      },
    });

    const map = new Map<string, TopTableDto>();
    for (const order of orders) {
      const current =
        map.get(order.tableId) ??
        ({
          tableId: order.tableId,
          tableNumber: order.table.number,
          orderCount: 0,
          total: 0,
        } as TopTableDto);
      current.orderCount += 1;
      for (const payment of order.payments) {
        current.total += toNumber(payment.amount);
      }
      map.set(order.tableId, current);
    }

    return Array.from(map.values())
      .map((row) => ({ ...row, total: round2(row.total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  // -----------------------------------------------------------------------
  // 5. Ingresos por método de pago
  // -----------------------------------------------------------------------
  async paymentsByMethod(from?: string, to?: string): Promise<RevenueByMethodDto[]> {
    const { start, end } = this.resolveRange(from, to);

    const grouped = await this.prisma.payment.groupBy({
      by: ['method'],
      where: { createdAt: { gte: start, lte: end } },
      _sum: { amount: true },
      _count: { _all: true },
    });

    // Devolvemos siempre los 4 métodos (incluidos los que no tienen datos).
    const allMethods: PaymentMethod[] = [
      PaymentMethod.EFECTIVO,
      PaymentMethod.YAPE,
      PaymentMethod.PLIN,
      PaymentMethod.TARJETA,
    ];

    return allMethods.map((method) => {
      const row = grouped.find((g) => g.method === method);
      return {
        method,
        total: round2(toNumber(row?._sum.amount)),
        count: row?._count._all ?? 0,
      };
    });
  }

  // -----------------------------------------------------------------------
  // Helpers de rango de fechas
  // -----------------------------------------------------------------------

  /** Rango genérico: por defecto últimos 30 días hasta ahora. */
  private resolveRange(from?: string, to?: string): { start: Date; end: Date } {
    const end = this.parseDate(to) ?? new Date();
    const start =
      this.parseDate(from) ?? new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  /** Rango por defecto dependiente del período solicitado. */
  private resolveRevenueRange(
    period: RevenuePeriod,
    from?: string,
    to?: string,
  ): { start: Date; end: Date } {
    const end = this.parseDate(to) ?? new Date();
    const parsedFrom = this.parseDate(from);
    if (parsedFrom) {
      return { start: parsedFrom, end };
    }

    const day = 24 * 60 * 60 * 1000;
    let span: number;
    switch (period) {
      case 'weekly':
        span = 12 * 7 * day; // últimas 12 semanas
        break;
      case 'monthly':
        span = 365 * day; // ~últimos 12 meses
        break;
      case 'daily':
      default:
        span = 30 * day; // últimos 30 días
        break;
    }
    return { start: new Date(end.getTime() - span), end };
  }

  /** Parsea una fecha ISO; devuelve undefined si es inválida o vacía. */
  private parseDate(value?: string): Date | undefined {
    if (!value) {
      return undefined;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  /** Clave de agrupación según el período (yyyy-mm-dd / yyyy-Www / yyyy-mm). */
  private bucketKey(date: Date, period: RevenuePeriod): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    switch (period) {
      case 'monthly':
        return `${year}-${month}`;
      case 'weekly': {
        const week = this.isoWeek(date);
        return `${week.year}-W${`${week.week}`.padStart(2, '0')}`;
      }
      case 'daily':
      default:
        return `${year}-${month}-${day}`;
    }
  }

  /** Número de semana ISO-8601 (con su año ISO asociado). */
  private isoWeek(date: Date): { year: number; week: number } {
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    // ISO: lunes = 1 ... domingo = 7
    const dayNr = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3); // jueves de esta semana
    const isoYear = target.getFullYear();
    const firstThursday = new Date(isoYear, 0, 4);
    const firstDayNr = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);
    const week =
      1 +
      Math.round(
        (target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000),
      );
    return { year: isoYear, week };
  }
}
