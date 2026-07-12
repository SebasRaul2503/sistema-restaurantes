import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { Icon } from '../../shared/components/icon/icon';
import { RestaurantSelector } from '../../shared/components/restaurant-selector/restaurant-selector';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const MOBILE_BREAKPOINT = 900;

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, RestaurantSelector],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);

  readonly user = this.auth.user;
  readonly settings = this.theme.settings;

  /** En escritorio el menú está visible; en móvil/tableta inicia oculto (drawer). */
  readonly isMobile = signal(this.computeMobile());
  readonly sidebarOpen = signal(!this.computeMobile());

  private readonly allItems: NavItem[] = [
    { path: '/panel', label: 'Panel', icon: 'panel' },
    { path: '/mesas', label: 'Mesas', icon: 'tables' },
    { path: '/cocina', label: 'Cocina', icon: 'kitchen' },
    { path: '/caja', label: 'Caja', icon: 'cash' },
    { path: '/carta', label: 'Carta', icon: 'menu', adminOnly: true },
    { path: '/reportes', label: 'Reportes', icon: 'reports', adminOnly: true },
    { path: '/locales', label: 'Locales', icon: 'building', adminOnly: true },
    { path: '/usuarios', label: 'Usuarios', icon: 'users', adminOnly: true },
    { path: '/configuracion', label: 'Configuración', icon: 'settings', adminOnly: true },
    { path: '/soporte', label: 'Soporte', icon: 'lifebuoy' },
  ];

  readonly navItems = computed(() =>
    this.allItems.filter((item) => !item.adminOnly || this.auth.isAdmin()),
  );

  @HostListener('window:resize')
  onResize(): void {
    const mobile = this.computeMobile();
    if (mobile !== this.isMobile()) {
      this.isMobile.set(mobile);
      this.sidebarOpen.set(!mobile);
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  /** Al navegar en móvil, cierra el menú para volver al contenido. */
  onNavigate(): void {
    if (this.isMobile()) {
      this.sidebarOpen.set(false);
    }
  }

  logout(): void {
    void this.auth.confirmAndLogout();
  }

  initials(name: string | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  private computeMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;
  }
}
