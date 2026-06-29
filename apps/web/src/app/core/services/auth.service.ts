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

/**
 * Estado de autenticación basado en señales. Datos sensibles (access token,
 * user, me) viven SOLO en memoria del cliente: ningún dato de sesión persiste
 * en localStorage. El refresh token se gestiona con una cookie httpOnly
 * emitida por el backend.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly activeRestaurant = inject(ActiveRestaurantService);

  /** Access token en memoria. Se pierde al cerrar la pestaña. */
  private readonly _accessToken = signal<string | null>(null);
  readonly accessToken = computed(() => this._accessToken());

  readonly user = signal<AuthUser | null>(null);
  readonly me = signal<MeResponse | null>(null);

  readonly isAuthenticated = computed(() => this._accessToken() !== null && this.user() !== null);
  readonly isAdmin = computed(() => this.user()?.role === UserRole.ADMIN);

  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.api.post<LoginResponse>('/auth/login', { email, password }),
    );
    this.setSession(res.accessToken, res.user);
    await this.refreshMe();
    await this.activeRestaurant.load();
  }

  /**
   * Intenta refrescar la sesión usando la cookie httpOnly. Si tiene éxito,
   * actualiza el access token y la info del usuario (ambos vienen en la
   * respuesta). Si falla, limpia la sesión.
   */
  async refresh(): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.api.post<LoginResponse>('/auth/refresh', {}),
      );
      this.setSession(res.accessToken, res.user);
      return true;
    } catch {
      this.clearSession();
      return false;
    }
  }

  /**
   * Hidrata la sesión al cargar la app: intenta un refresh silencioso. Si
   * la cookie sigue viva, el usuario entra sin escribir credenciales.
   */
  async bootstrap(): Promise<boolean> {
    if (this._accessToken()) return true; // ya hidratado
    return this.refresh();
  }

  /**
   * Refresca la información de `/auth/me` (usuario + locales + local activo)
   * usando el header X-Restaurant-Id si hay uno seleccionado.
   */
  async refreshMe(): Promise<MeResponse | null> {
    if (!this.isAuthenticated()) return null;
    try {
      const me = await firstValueFrom(this.api.get<MeResponse>('/auth/me'));
      this.me.set(me);
      return me;
    } catch {
      return null;
    }
  }

  /**
   * Cierra sesión: llama al backend (que revoca el refresh y limpia la
   * cookie) y luego limpia el estado en memoria.
   */
  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.api.post<void>('/auth/logout', {}));
    } catch {
      // Si falla, igual limpiamos localmente.
    }
    this.clearSession();
    this.activeRestaurant.clear();
    void this.router.navigate(['/ingresar']);
  }

  private setSession(accessToken: string, user: AuthUser): void {
    this._accessToken.set(accessToken);
    this.user.set(user);
  }

  private clearSession(): void {
    this._accessToken.set(null);
    this.user.set(null);
    this.me.set(null);
  }
}
