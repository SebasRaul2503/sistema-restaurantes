import { computed, inject, Injectable, signal } from '@angular/core';
import { MyRestaurantDto } from '@restaurante/shared-types';
import { RestaurantsApi } from '../data/restaurants.api';

/**
 * Estado de los locales disponibles para el usuario y del local activo.
 * Vive SOLO en memoria (signals). No persiste en localStorage: al recargar
 * la pestaña o cambiar de dispositivo, se vuelve a pedir al backend (y el
 * backend puede sugerir el último local si lo guardó en su sesión).
 */
@Injectable({ providedIn: 'root' })
export class ActiveRestaurantService {
  private readonly api = inject(RestaurantsApi);

  readonly restaurants = signal<MyRestaurantDto[]>([]);
  readonly activeRestaurantId = signal<string | null>(null);
  readonly loaded = signal(false);

  readonly activeRestaurant = computed<MyRestaurantDto | null>(() => {
    const id = this.activeRestaurantId();
    if (!id) return null;
    return this.restaurants().find((r) => r.id === id) ?? null;
  });

  readonly hasMultiple = computed(() => this.restaurants().length > 1);
  readonly needsSelection = computed(
    () => this.loaded() && this.hasMultiple() && this.activeRestaurantId() === null,
  );

  /**
   * Carga los locales del usuario. Si solo tiene uno, lo fija como activo.
   * Si se pasa `preferredId` (p. ej. sugerido por el backend tras un
   * refresh), se usa siempre que siga siendo válido.
   */
  async load(preferredId: string | null = null): Promise<void> {
    try {
      const list = await this.api.listMine();
      this.restaurants.set(list);

      const candidate = preferredId ?? this.activeRestaurantId();
      const stillValid = candidate !== null && list.some((r) => r.id === candidate);
      if (stillValid) {
        this.setActive(candidate);
      } else {
        const next = list.length === 1 ? (list[0]?.id ?? null) : null;
        this.setActive(next);
      }
    } catch {
      this.restaurants.set([]);
      this.setActive(null);
    } finally {
      this.loaded.set(true);
    }
  }

  setActive(id: string | null): void {
    this.activeRestaurantId.set(id);
  }

  clear(): void {
    this.restaurants.set([]);
    this.activeRestaurantId.set(null);
    this.loaded.set(false);
  }
}
