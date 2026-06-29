import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Cliente HTTP tipado. Centraliza la URL base de la API y envía credenciales
 * (cookies) en cada petición. Las cookies httpOnly del refresh token las
 * gestiona el browser automáticamente.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Observable<T> {
    return this.http.get<T>(`${this.base}${path}`, {
      params: this.toParams(params),
      withCredentials: true,
    });
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body ?? {}, { withCredentials: true });
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.http.patch<T>(`${this.base}${path}`, body ?? {}, { withCredentials: true });
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}${path}`, { withCredentials: true });
  }

  private toParams(params?: Record<string, string | number | boolean | undefined>): HttpParams {
    let hp = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          hp = hp.set(key, String(value));
        }
      }
    }
    return hp;
  }
}
