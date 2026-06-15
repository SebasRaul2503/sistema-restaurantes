import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  DashboardDto,
  RevenueByMethodDto,
  RevenuePointDto,
  TopDishDto,
  TopTableDto,
} from '@restaurante/shared-types';
import { ApiService } from '../services/api.service';

@Injectable({ providedIn: 'root' })
export class ReportsApi {
  private readonly api = inject(ApiService);

  dashboard(): Promise<DashboardDto> {
    return firstValueFrom(this.api.get<DashboardDto>('/reports/dashboard'));
  }
  revenue(period: 'daily' | 'weekly' | 'monthly', from?: string, to?: string): Promise<RevenuePointDto[]> {
    return firstValueFrom(this.api.get<RevenuePointDto[]>('/reports/revenue', { period, from, to }));
  }
  topDishes(from?: string, to?: string, limit = 10): Promise<TopDishDto[]> {
    return firstValueFrom(this.api.get<TopDishDto[]>('/reports/top-dishes', { from, to, limit }));
  }
  topTables(from?: string, to?: string, limit = 10): Promise<TopTableDto[]> {
    return firstValueFrom(this.api.get<TopTableDto[]>('/reports/top-tables', { from, to, limit }));
  }
  paymentsByMethod(from?: string, to?: string): Promise<RevenueByMethodDto[]> {
    return firstValueFrom(this.api.get<RevenueByMethodDto[]>('/reports/payments-by-method', { from, to }));
  }
}
