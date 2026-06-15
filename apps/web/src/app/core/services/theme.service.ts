import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RestaurantSettingsDto } from '@restaurante/shared-types';
import { ApiService } from './api.service';

/**
 * Aplica la marca del restaurante (colores) a las variables CSS globales, de
 * modo que todo el tema se adapte automáticamente a la configuración.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly api = inject(ApiService);
  readonly settings = signal<RestaurantSettingsDto | null>(null);

  async load(): Promise<void> {
    try {
      const settings = await firstValueFrom(this.api.get<RestaurantSettingsDto>('/settings'));
      this.apply(settings);
    } catch {
      // Si falla, se mantienen los colores por defecto.
    }
  }

  apply(settings: RestaurantSettingsDto): void {
    this.settings.set(settings);
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', settings.primaryColor);
    root.style.setProperty('--brand-secondary', settings.secondaryColor);
    root.style.setProperty('--brand-primary-contrast', this.contrastColor(settings.primaryColor));
    document.title = `${settings.name} · Gestión`;
  }

  /** Elige texto blanco o negro según la luminancia del color de marca. */
  private contrastColor(hex: string): string {
    const c = hex.replace('#', '');
    if (c.length !== 6) return '#ffffff';
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#1a202c' : '#ffffff';
  }
}
