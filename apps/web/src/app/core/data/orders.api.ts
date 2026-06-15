import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { OrderDto, OrderSummaryDto, PaymentMethod } from '@restaurante/shared-types';
import { ApiService } from '../services/api.service';

export interface AddItemPayload {
  dishId: string;
  quantity: number;
  notes?: string;
}
export interface SplitGroupInput {
  name: string;
  items: { orderItemId: string; quantity: number }[];
}
export interface PaymentPayload {
  method: PaymentMethod;
  amount: number;
  billGroupId?: string;
  reference?: string;
}

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly api = inject(ApiService);

  active(): Promise<OrderSummaryDto[]> {
    return firstValueFrom(this.api.get<OrderSummaryDto[]>('/orders/active'));
  }
  get(id: string): Promise<OrderDto> {
    return firstValueFrom(this.api.get<OrderDto>(`/orders/${id}`));
  }
  activeByTable(tableId: string): Promise<OrderDto | null> {
    return firstValueFrom(this.api.get<OrderDto | null>(`/orders/table/${tableId}/active`));
  }
  create(tableId: string, notes?: string): Promise<OrderDto> {
    return firstValueFrom(this.api.post<OrderDto>('/orders', { tableId, notes }));
  }
  cancel(id: string): Promise<OrderDto> {
    return firstValueFrom(this.api.post<OrderDto>(`/orders/${id}/cancel`));
  }

  // Ítems
  addItem(orderId: string, payload: AddItemPayload): Promise<OrderDto> {
    return firstValueFrom(this.api.post<OrderDto>(`/orders/${orderId}/items`, payload));
  }
  updateItem(itemId: string, payload: { quantity?: number; notes?: string }): Promise<OrderDto> {
    return firstValueFrom(this.api.patch<OrderDto>(`/orders/items/${itemId}`, payload));
  }
  removeItem(itemId: string): Promise<OrderDto> {
    return firstValueFrom(this.api.delete<OrderDto>(`/orders/items/${itemId}`));
  }
  replaceItem(itemId: string, payload: { dishId?: string; quantity?: number; reason?: string; notes?: string }): Promise<OrderDto> {
    return firstValueFrom(this.api.post<OrderDto>(`/orders/items/${itemId}/replace`, payload));
  }

  // División de cuenta
  splitEven(orderId: string, parts: number, names?: string[]): Promise<OrderDto> {
    return firstValueFrom(this.api.post<OrderDto>(`/orders/${orderId}/split/even`, { parts, names }));
  }
  splitByItems(orderId: string, groups: SplitGroupInput[]): Promise<OrderDto> {
    return firstValueFrom(this.api.post<OrderDto>(`/orders/${orderId}/split/items`, { groups }));
  }
  createGroup(orderId: string, name: string, fixedAmount?: number): Promise<OrderDto> {
    return firstValueFrom(this.api.post<OrderDto>(`/orders/${orderId}/bill-groups`, { name, fixedAmount }));
  }
  clearSplit(orderId: string): Promise<OrderDto> {
    return firstValueFrom(this.api.delete<OrderDto>(`/orders/${orderId}/split`));
  }
  deleteGroup(groupId: string): Promise<OrderDto> {
    return firstValueFrom(this.api.delete<OrderDto>(`/bill-groups/${groupId}`));
  }

  // Pagos
  pay(orderId: string, payload: PaymentPayload): Promise<OrderDto> {
    return firstValueFrom(this.api.post<OrderDto>(`/orders/${orderId}/payments`, payload));
  }
}
