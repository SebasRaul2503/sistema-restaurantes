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
import {
  endOfCivilDayInLima,
  limaDateKey,
  limaIsoWeek,
  limaYearMonthKey,
  startOfCivilDayInLima,
  startOfMonthInLima,
} from '../../common/time/lima-clock';

type RevenuePeriod = 'daily' | 'weekly' | 'monthly';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------------------------------------------------
  // 1. Dashboard
  // -----------------------------------------------------------------------
  async dashboard(restaurantId: string): Promise<DashboardDto> {
    const [
      tablesByStatus,
      activeOrders,
      itemsByStatus,
      revenueTodayAgg,
      revenueMonthAgg,
    ] = await Promise.all([
      this.prisma.table.groupBy({
        by: ['status'],
        where: { active: true, restaurantId },
        _count: { _all: true },
      }),
      this.prisma.order.count({
        where: { status: OrderStatus.ABIERTA, restaurantId },
      }),
      this.prisma.orderItem.groupBy({
        by: ['status'],
        where: {
          isModified: false,
          order: { status: OrderStatus.ABIERTA, restaurantId },
        },
        _count: { _all: true },
      }),
      this.prisma.payment.aggregate({
        where: { createdAt: { gte: startOfCivilDayInLima(new Date()) }, order: { restaurantId } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { createdAt: { gte: startOfMonthInLima() }, order: { restaurantId } },
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
    from: string | undefined,
    to: string | undefined,
    restaurantId: string,
  ): Promise<RevenuePointDto[]> {
    const { start, end } = this.resolveRevenueRange(period, from, to);

    const payments = await this.prisma.payment.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        order: { restaurantId },
      },
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
  async topDishes(
    from: string | undefined,
    to: string | undefined,
    limit: number,
    restaurantId: string,
  ): Promise<TopDishDto[]> {
    const { start, end } = this.resolveRange(from, to);

    const items = await this.prisma.orderItem.findMany({
      where: {
        isModified: false,
        createdAt: { gte: start, lte: end },
        order: { restaurantId },
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
  async topTables(
    from: string | undefined,
    to: string | undefined,
    limit: number,
    restaurantId: string,
  ): Promise<TopTableDto[]> {
    const { start, end } = this.resolveRange(from, to);

    const orders = await this.prisma.order.findMany({
      where: { openedAt: { gte: start, lte: end }, restaurantId },
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
  async paymentsByMethod(
    from: string | undefined,
    to: string | undefined,
    restaurantId: string,
  ): Promise<RevenueByMethodDto[]> {
    const { start, end } = this.resolveRange(from, to);

    const grouped = await this.prisma.payment.groupBy({
      by: ['method'],
      where: {
        createdAt: { gte: start, lte: end },
        order: { restaurantId },
      },
      _sum: { amount: true },
      _count: { _all: true },
    });

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

  private resolveRange(from?: string, to?: string): { start: Date; end: Date } {
    const end = to ? endOfCivilDayInLima(to) : new Date();
    const start = from ? startOfCivilDayInLima(from) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  private resolveRevenueRange(
    period: RevenuePeriod,
    from?: string,
    to?: string,
  ): { start: Date; end: Date } {
    const end = to ? endOfCivilDayInLima(to) : new Date();
    const parsedFrom = from ? startOfCivilDayInLima(from) : undefined;
    if (parsedFrom) {
      return { start: parsedFrom, end };
    }

    const day = 24 * 60 * 60 * 1000;
    let span: number;
    switch (period) {
      case 'weekly':
        span = 12 * 7 * day;
        break;
      case 'monthly':
        span = 365 * day;
        break;
      case 'daily':
      default:
        span = 30 * day;
        break;
    }
    return { start: new Date(end.getTime() - span), end };
  }

  private bucketKey(date: Date, period: RevenuePeriod): string {
    switch (period) {
      case 'monthly':
        return limaYearMonthKey(date);
      case 'weekly': {
        const week = limaIsoWeek(date);
        return `${week.year}-W${`${week.week}`.padStart(2, '0')}`;
      }
      case 'daily':
      default:
        return limaDateKey(date);
    }
  }
}
