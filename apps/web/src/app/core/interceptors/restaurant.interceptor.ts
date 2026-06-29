import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActiveRestaurantService } from '../services/active-restaurant.service';

/**
 * Inyecta el header `X-Restaurant-Id` en cada petición que NO sea del propio
 * selector de locales o login. Permite al backend (LocalGuard) saber qué local
 * está activo.
 */
export const restaurantInterceptor: HttpInterceptorFn = (req, next) => {
  const active = inject(ActiveRestaurantService);
  const id = active.activeRestaurantId();
  const isExcluded =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/refresh') ||
    req.url.includes('/my-restaurants') ||
    /\/restaurants\/[^/]+\/theme$/.test(req.url);

  if (id && !isExcluded) {
    req = req.clone({ setHeaders: { 'X-Restaurant-Id': id } });
  }
  return next(req);
};
