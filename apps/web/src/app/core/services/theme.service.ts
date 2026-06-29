import { effect, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RestaurantThemeDto, RestaurantSettingsDto } from '@restaurante/shared-types';
import { ActiveRestaurantService } from './active-restaurant.service';
import { ApiService } from './api.service';

/**
 * Aplica la marca del restaurante (colores) a las variables CSS globales. Si
 * hay un local activo con override, usa ese; en caso contrario, usa la marca
 * del tenant (RestaurantSettings).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly api = inject(ApiService);
  private readonly activeRestaurant = inject(ActiveRestaurantService);

  readonly settings = signal<RestaurantSettingsDto | null>(null);
  readonly theme = signal<RestaurantThemeDto | null>(null);

  constructor() {
    effect(() => {
      const id = this.activeRestaurant.activeRestaurantId();
      if (id) {
        void this.loadRestaurantTheme(id);
      } else {
        void this.loadTenant();
      }
    });
  }

  /** Carga la marca del tenant (fallback). Llamado si no hay local activo. */
  async loadTenant(): Promise<void> {
    try {
      const settings = await firstValueFrom(this.api.get<RestaurantSettingsDto>('/settings'));
      this.settings.set(settings);
      this.apply({
        name: settings.name,
        logoUrl: settings.logoUrl,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
      });
    } catch {
      // Si falla, se mantienen los colores por defecto.
    }
  }

  /** Carga la marca efectiva del local activo. */
  async loadRestaurantTheme(restaurantId: string): Promise<void> {
    try {
      const theme = await firstValueFrom(
        this.api.get<RestaurantThemeDto>(`/restaurants/${restaurantId}/theme`),
      );
      this.theme.set(theme);
      this.apply(theme);
    } catch {
      void this.loadTenant();
    }
  }

  /**
   * Aplica una marca al documento. Público para que la pantalla de Configuración
   * pueda refrescar el tema tras guardar.
   */
  apply(theme: RestaurantThemeDto): void {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', theme.primaryColor);
    root.style.setProperty('--brand-secondary', theme.secondaryColor);
    root.style.setProperty('--brand-primary-contrast', this.contrastColor(theme.primaryColor));
    document.title = `${theme.name} · Gestión`;
  }

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
