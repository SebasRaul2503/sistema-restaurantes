import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  AuthUser,
  LoginResponse,
  MeResponse,
  UserRole,
} from '@restaurante/shared-types';
import { ActiveRestaurantService } from './active-restaurant.service';
import { ApiService } from './api.service';

const ACCESS_KEY = 'rst_access';
const REFRESH_KEY = 'rst_refresh';
const USER_KEY = 'rst_user';
const ME_KEY = 'rst_me';

/** Estado de autenticación basado en señales. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly activeRestaurant = inject(ActiveRestaurantService);

  readonly user = signal<AuthUser | null>(this.restoreUser());
  readonly me = signal<MeResponse | null>(this.restoreMe());
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isAdmin = computed(() => this.user()?.role === UserRole.ADMIN);

  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }
  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(this.api.post<LoginResponse>('/auth/login', { email, password }));
    this.persist(res);
    await this.refreshMe();
    await this.activeRestaurant.load();
  }

  async refresh(): Promise<boolean> {
    const token = this.refreshToken;
    if (!token) return false;
    try {
      const res = await firstValueFrom(this.api.post<LoginResponse>('/auth/refresh', { refreshToken: token }));
      this.persist(res);
      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  /**
   * Refresca la información de `/auth/me` (usuario + locales + local activo)
   * usando el header X-Restaurant-Id si hay uno seleccionado.
   */
  async refreshMe(): Promise<MeResponse | null> {
    if (!this.isAuthenticated()) return null;
    try {
      const me = await firstValueFrom(this.api.get<MeResponse>('/auth/me'));
      this.persistMe(me);
      return me;
    } catch {
      return null;
    }
  }

  logout(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ME_KEY);
    this.user.set(null);
    this.me.set(null);
    this.activeRestaurant.clear();
    void this.router.navigate(['/ingresar']);
  }

  private persist(res: LoginResponse): void {
    localStorage.setItem(ACCESS_KEY, res.accessToken);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.user.set(res.user);
  }

  private persistMe(me: MeResponse): void {
    localStorage.setItem(ME_KEY, JSON.stringify(me));
    this.me.set(me);
  }

  private restoreUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }

  private restoreMe(): MeResponse | null {
    const raw = localStorage.getItem(ME_KEY);
    return raw ? (JSON.parse(raw) as MeResponse) : null;
  }
}
