import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TableDto, TableStatus } from '@restaurante/shared-types';
import { ApiService } from '../services/api.service';

export interface TablePayload {
  number: number;
  name?: string;
  capacity?: number;
  posX?: number;
  posY?: number;
}

@Injectable({ providedIn: 'root' })
export class TablesApi {
  private readonly api = inject(ApiService);

  list(): Promise<TableDto[]> {
    return firstValueFrom(this.api.get<TableDto[]>('/tables'));
  }
  get(id: string): Promise<TableDto> {
    return firstValueFrom(this.api.get<TableDto>(`/tables/${id}`));
  }
  create(payload: TablePayload): Promise<TableDto> {
    return firstValueFrom(this.api.post<TableDto>('/tables', payload));
  }
  update(id: string, payload: Partial<TablePayload> & { active?: boolean }): Promise<TableDto> {
    return firstValueFrom(this.api.patch<TableDto>(`/tables/${id}`, payload));
  }
  changeStatus(id: string, status: TableStatus): Promise<TableDto> {
    return firstValueFrom(this.api.patch<TableDto>(`/tables/${id}/status`, { status }));
  }
  remove(id: string): Promise<TableDto> {
    return firstValueFrom(this.api.delete<TableDto>(`/tables/${id}`));
  }
}
