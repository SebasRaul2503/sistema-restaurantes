import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  RevenueByMethodDto,
  RevenuePointDto,
  TopDishDto,
  TopTableDto,
} from '@restaurante/shared-types';
import { ReportsApi } from '../../core/data/reports.api';
import { ActiveRestaurantService } from '../../core/services/active-restaurant.service';
import { SolesPipe } from '../../shared/pipes/soles.pipe';
import { EnumLabelPipe } from '../../shared/pipes/enum-label.pipe';
import { DateField } from '../../shared/components/date-field/date-field';

type RevenuePeriod = 'daily' | 'weekly' | 'monthly';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FormsModule, SolesPipe, EnumLabelPipe, DateField],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class ReportsPage {
  private readonly reports = inject(ReportsApi);
  private readonly active = inject(ActiveRestaurantService);

  readonly from = signal('');
  readonly to = signal('');
  readonly period = signal<RevenuePeriod>('daily');

  readonly loading = signal(false);

  readonly revenue = signal<RevenuePointDto[]>([]);
  readonly dishes = signal<TopDishDto[]>([]);
  readonly tables = signal<TopTableDto[]>([]);
  readonly payments = signal<RevenueByMethodDto[]>([]);

  readonly revenueMax = computed(() =>
    this.revenue().reduce((max, p) => Math.max(max, p.total), 0),
  );
  readonly revenueSum = computed(() =>
    this.revenue().reduce((sum, p) => sum + p.total, 0),
  );
  readonly dishesMax = computed(() =>
    this.dishes().reduce((max, d) => Math.max(max, d.quantity), 0),
  );
  readonly paymentsMax = computed(() =>
    this.payments().reduce((max, p) => Math.max(max, p.total), 0),
  );

  constructor() {
    effect(() => {
      this.active.activeRestaurantId();
      void this.refresh();
    });
  }

  pct(value: number, max: number): number {
    return max > 0 ? (value / max) * 100 : 0;
  }

  async refresh(): Promise<void> {
    const from = this.from() || undefined;
    const to = this.to() || undefined;
    this.loading.set(true);
    try {
      const [revenue, dishes, tables, payments] = await Promise.all([
        this.reports.revenue(this.period(), from, to),
        this.reports.topDishes(from, to, 10),
        this.reports.topTables(from, to),
        this.reports.paymentsByMethod(from, to),
      ]);
      this.revenue.set(revenue);
      this.dishes.set(dishes);
      this.tables.set(tables);
      this.payments.set(payments);
    } catch {
      this.revenue.set([]);
      this.dishes.set([]);
      this.tables.set([]);
      this.payments.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
