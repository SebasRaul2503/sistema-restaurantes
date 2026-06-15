import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { KitchenItemDto, OrderItemStatus } from '@restaurante/shared-types';
import { ApiService } from '../services/api.service';

@Injectable({ providedIn: 'root' })
export class KitchenApi {
  private readonly api = inject(ApiService);

  queue(): Promise<KitchenItemDto[]> {
    return firstValueFrom(this.api.get<KitchenItemDto[]>('/kitchen/queue'));
  }
  changeStatus(itemId: string, status: OrderItemStatus): Promise<KitchenItemDto> {
    return firstValueFrom(this.api.patch<KitchenItemDto>(`/kitchen/items/${itemId}/status`, { status }));
  }
}
