import { computed, inject, Injectable, signal } from '@angular/core';
import { MyRestaurantDto } from '@restaurante/shared-types';
import { RestaurantsApi } from '../data/restaurants.api';

const ACTIVE_RESTAURANT_KEY = 'rst_active_restaurant';

/**
 * Estado de los locales disponibles para el usuario y del local activo.
 * Persiste el `activeRestaurantId` en localStorage para mantener la elección
 * entre recargas.
 */
@Injectable({ providedIn: 'root' })
export class ActiveRestaurantService {
  private readonly api = inject(RestaurantsApi);

  readonly restaurants = signal<MyRestaurantDto[]>([]);
  readonly activeRestaurantId = signal<string | null>(this.restore());
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

  /** Carga los locales del usuario. Si solo tiene uno, lo fija como activo. */
  async load(): Promise<void> {
    try {
      const list = await this.api.listMine();
      this.restaurants.set(list);

      const stored = this.activeRestaurantId();
      const stillValid = stored !== null && list.some((r) => r.id === stored);
      if (!stillValid) {
        const next = list.length === 1 ? list[0]?.id ?? null : null;
        this.setActive(next);
      } else if (list.length === 1 && list[0]?.id !== stored) {
        this.setActive(list[0].id);
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
    if (id === null) {
      localStorage.removeItem(ACTIVE_RESTAURANT_KEY);
    } else {
      localStorage.setItem(ACTIVE_RESTAURANT_KEY, id);
    }
  }

  clear(): void {
    this.restaurants.set([]);
    this.setActive(null);
    this.loaded.set(false);
  }

  private restore(): string | null {
    return localStorage.getItem(ACTIVE_RESTAURANT_KEY);
  }
}
