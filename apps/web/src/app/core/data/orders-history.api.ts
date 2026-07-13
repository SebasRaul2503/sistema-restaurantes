import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  OrderDto,
  OrderHistoryFilterDto,
  PaginatedOrdersDto,
} from '@restaurante/shared-types';
import { ApiService } from '../services/api.service';

@Injectable({ providedIn: 'root' })
export class OrdersHistoryApi {
  private readonly api = inject(ApiService);

  list(filter: OrderHistoryFilterDto): Promise<PaginatedOrdersDto> {
    const params: Record<string, string | number | undefined> = {};
    if (filter.from) params['from'] = filter.from;
    if (filter.to) params['to'] = filter.to;
    if (filter.status) params['status'] = filter.status;
    if (filter.q) params['q'] = filter.q;
    if (filter.page) params['page'] = filter.page;
    if (filter.pageSize) params['pageSize'] = filter.pageSize;
    return firstValueFrom(this.api.get<PaginatedOrdersDto>('/orders/history', params));
  }

  /** Reusa el endpoint GET /orders/:id (que ya devuelve el snapshot completo). */
  getOne(id: string): Promise<OrderDto> {
    return firstValueFrom(this.api.get<OrderDto>(`/orders/${id}`));
  }
}
