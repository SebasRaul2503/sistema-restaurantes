import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * Manejo central de errores: muestra el mensaje del backend (en español) como
 * toast y, ante un 401, intenta refrescar la sesión una vez antes de cerrarla.
 * El refresh usa la cookie httpOnly (no envía token en el body).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const notify = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthCall =
        req.url.includes('/auth/login') ||
        req.url.includes('/auth/refresh') ||
        req.url.includes('/auth/logout');

      if (error.status === 401 && !isAuthCall && auth.isAuthenticated()) {
        return from(auth.refresh()).pipe(
          switchMap((ok) => {
            if (ok) {
              const retried = req.clone({
                setHeaders: { Authorization: `Bearer ${auth.accessToken()}` },
              });
              return next(retried);
            }
            return throwError(() => error);
          }),
        );
      }

      const message = extractMessage(error);
      if (error.status !== 401) {
        notify.error(message);
      }
      return throwError(() => error);
    }),
  );
};

function extractMessage(error: HttpErrorResponse): string {
  if (error.error && typeof error.error === 'object') {
    const msg = (error.error as { message?: string | string[] }).message;
    if (Array.isArray(msg)) return msg.join(' ');
    if (typeof msg === 'string') return msg;
  }
  if (error.status === 0) return 'No se pudo conectar con el servidor.';
  return 'Ocurrió un error inesperado.';
}
