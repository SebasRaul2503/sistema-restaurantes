import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RestaurantDto, RestaurantSettingsDto } from '@restaurante/shared-types';
import { RestaurantsApi } from '../../core/data/restaurants.api';
import { SettingsApi } from '../../core/data/settings.api';
import { ActiveRestaurantService } from '../../core/services/active-restaurant.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsPage {
  private readonly settingsApi = inject(SettingsApi);
  private readonly restaurantsApi = inject(RestaurantsApi);
  private readonly active = inject(ActiveRestaurantService);
  private readonly theme = inject(ThemeService);
  private readonly notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly saving = signal(false);

  // --- Datos del negocio (tenant) ---
  readonly name = signal('');
  readonly address = signal('');
  readonly phone = signal('');
  readonly businessInfo = signal('');

  // --- Marca del local activo (override) ---
  readonly localName = signal('');
  readonly localAddress = signal('');
  readonly localPhone = signal('');
  readonly primaryColor = signal('#e63946');
  readonly secondaryColor = signal('#1d3557');
  readonly logoUrl = signal<string | null>(null);

  /** Restaurante activo (para saber a qué local se aplica la marca). */
  readonly activeRestaurant = this.active.activeRestaurant;
  readonly activeRestaurantId = this.active.activeRestaurantId;

  /** true si el local activo tiene override propio (no hereda del tenant). */
  readonly hasLocalBrand = signal(false);

  constructor() {
    // Recarga al cambiar de local (y al instanciar el componente).
    effect(() => {
      this.active.activeRestaurantId();
      untracked(() => void this.load());
    });
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const restaurantId = this.active.activeRestaurantId();
      const [tenant, local] = await Promise.all([
        this.settingsApi.get(),
        restaurantId
          ? this.restaurantsApi.getOne(restaurantId).catch(() => null)
          : Promise.resolve(null),
      ]);
      untracked(() => this.populate(tenant, local));
    } catch {
      // Si falla, se mantienen los valores por defecto.
    } finally {
      this.loading.set(false);
    }
  }

  private populate(tenant: RestaurantSettingsDto, local: RestaurantDto | null): void {
    // Tenant
    this.name.set(tenant.name);
    this.address.set(tenant.address ?? '');
    this.phone.set(tenant.phone ?? '');
    this.businessInfo.set(tenant.businessInfo ?? '');

    // Local (puede ser null si el usuario no tiene local activo)
    if (local) {
      this.localName.set(local.name);
      this.localAddress.set(local.address ?? '');
      this.localPhone.set(local.phone ?? '');
      // Los override del local: si son null, mostramos los del tenant como fallback visual
      this.primaryColor.set(local.primaryColor ?? tenant.primaryColor);
      this.secondaryColor.set(local.secondaryColor ?? tenant.secondaryColor);
      this.logoUrl.set(local.logoUrl ?? tenant.logoUrl ?? null);
      this.hasLocalBrand.set(
        local.primaryColor !== null || local.secondaryColor !== null || local.logoUrl !== null,
      );
    } else {
      // Sin local activo: mostramos la marca del tenant
      this.primaryColor.set(tenant.primaryColor);
      this.secondaryColor.set(tenant.secondaryColor);
      this.logoUrl.set(tenant.logoUrl ?? null);
      this.hasLocalBrand.set(false);
    }
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.logoUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  clearLogo(): void {
    this.logoUrl.set(null);
  }

  /** Suelta el override del local y hereda del tenant. */
  inheritFromTenant(): void {
    this.hasLocalBrand.set(false);
    // Se guarda como null en el local → el backend usa el del tenant
    void this.saveLocalBrand(null, null, null);
  }

  async save(): Promise<void> {
    if (!this.name().trim()) return;
    this.saving.set(true);
    try {
      // 1) Datos del negocio (tenant)
      const tenant = await this.settingsApi.update({
        name: this.name().trim(),
        address: this.address(),
        phone: this.phone(),
        businessInfo: this.businessInfo(),
        primaryColor: this.primaryColor(),
        secondaryColor: this.secondaryColor(),
        logoUrl: this.logoUrl() ?? '',
      });
      this.theme.apply(tenant);

      // 2) Marca y datos del local activo
      const restaurantId = this.active.activeRestaurantId();
      if (restaurantId) {
        await this.saveLocalBrand(this.primaryColor(), this.secondaryColor(), this.logoUrl());
      }

      this.notify.success('Configuración guardada');
      // Refresca la marca efectiva del theme
      if (restaurantId) {
        void this.theme.loadRestaurantTheme(restaurantId);
      }
    } catch {
      // El error se notifica de forma global.
    } finally {
      this.saving.set(false);
    }
  }

  /** Guarda los overrides de marca del local activo. */
  private async saveLocalBrand(
    primaryColor: string | null,
    secondaryColor: string | null,
    logoUrl: string | null,
  ): Promise<void> {
    const restaurantId = this.active.activeRestaurantId();
    if (!restaurantId) return;
    const payload: Record<string, string | null | undefined> = {
      primaryColor,
      secondaryColor,
      logoUrl,
    };
    await this.restaurantsApi.update(restaurantId, payload as never);
    // Recarga el local para refrescar hasLocalBrand
    const local = await this.restaurantsApi.getOne(restaurantId);
    this.hasLocalBrand.set(
      local.primaryColor !== null || local.secondaryColor !== null || local.logoUrl !== null,
    );
  }
}
