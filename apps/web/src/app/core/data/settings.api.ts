import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RestaurantSettingsDto } from '@restaurante/shared-types';
import { ApiService } from '../services/api.service';

export interface SettingsPayload {
  name?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  address?: string;
  phone?: string;
  businessInfo?: string;
  currency?: string;
}

@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private readonly api = inject(ApiService);

  get(): Promise<RestaurantSettingsDto> {
    return firstValueFrom(this.api.get<RestaurantSettingsDto>('/settings'));
  }
  update(payload: SettingsPayload): Promise<RestaurantSettingsDto> {
    return firstValueFrom(this.api.patch<RestaurantSettingsDto>('/settings', payload));
  }
}
