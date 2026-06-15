import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthUser, LoginResponse, UserRole } from '@restaurante/shared-types';
import { ApiService } from './api.service';

const ACCESS_KEY = 'rst_access';
const REFRESH_KEY = 'rst_refresh';
const USER_KEY = 'rst_user';

/** Estado de autenticación basado en señales. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly user = signal<AuthUser | null>(this.restoreUser());
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

  logout(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
    void this.router.navigate(['/ingresar']);
  }

  private persist(res: LoginResponse): void {
    localStorage.setItem(ACCESS_KEY, res.accessToken);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.user.set(res.user);
  }

  private restoreUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }
}
