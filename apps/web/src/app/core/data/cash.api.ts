import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CashMovementType, CashSessionDto } from '@restaurante/shared-types';
import { ApiService } from '../services/api.service';

@Injectable({ providedIn: 'root' })
export class CashApi {
  private readonly api = inject(ApiService);

  current(): Promise<CashSessionDto | null> {
    return firstValueFrom(this.api.get<CashSessionDto | null>('/cash-register/current'));
  }
  history(limit = 50): Promise<CashSessionDto[]> {
    return firstValueFrom(this.api.get<CashSessionDto[]>('/cash-register/history', { limit }));
  }
  open(openingAmount: number): Promise<CashSessionDto> {
    return firstValueFrom(this.api.post<CashSessionDto>('/cash-register/open', { openingAmount }));
  }
  addMovement(type: CashMovementType, amount: number, description: string): Promise<CashSessionDto> {
    return firstValueFrom(this.api.post<CashSessionDto>('/cash-register/movements', { type, amount, description }));
  }
  close(actualAmount: number, notes?: string): Promise<CashSessionDto> {
    return firstValueFrom(this.api.post<CashSessionDto>('/cash-register/close', { actualAmount, notes }));
  }
}
