import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RestaurantSettingsDto } from '@restaurante/shared-types';
import { SettingsApi } from '../../core/data/settings.api';
import { ThemeService } from '../../core/services/theme.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsPage implements OnInit {
  private readonly settingsApi = inject(SettingsApi);
  private readonly theme = inject(ThemeService);
  private readonly notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly name = signal('');
  readonly address = signal('');
  readonly phone = signal('');
  readonly businessInfo = signal('');
  readonly primaryColor = signal('#e63946');
  readonly secondaryColor = signal('#1d3557');
  readonly logoUrl = signal<string | null>(null);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const settings = await this.settingsApi.get();
      this.populate(settings);
    } catch {
      // Si falla, se mantienen los valores por defecto.
    } finally {
      this.loading.set(false);
    }
  }

  private populate(settings: RestaurantSettingsDto): void {
    this.name.set(settings.name);
    this.address.set(settings.address ?? '');
    this.phone.set(settings.phone ?? '');
    this.businessInfo.set(settings.businessInfo ?? '');
    this.primaryColor.set(settings.primaryColor);
    this.secondaryColor.set(settings.secondaryColor);
    this.logoUrl.set(settings.logoUrl);
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

  async save(): Promise<void> {
    if (!this.name().trim()) return;
    this.saving.set(true);
    try {
      const result = await this.settingsApi.update({
        name: this.name().trim(),
        address: this.address(),
        phone: this.phone(),
        businessInfo: this.businessInfo(),
        primaryColor: this.primaryColor(),
        secondaryColor: this.secondaryColor(),
        logoUrl: this.logoUrl() ?? '',
      });
      this.theme.apply(result);
      this.notify.success('Configuración guardada');
    } catch {
      // El error se notifica de forma global.
    } finally {
      this.saving.set(false);
    }
  }
}
