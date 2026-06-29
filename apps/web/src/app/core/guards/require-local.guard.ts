import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ActiveRestaurantService } from '../services/active-restaurant.service';
import { AuthService } from '../services/auth.service';

/**
 * Garantiza que el usuario tenga un local activo. Si tiene más de un local y
 * ninguno elegido, redirige a `/seleccionar-local`. Si solo tiene uno, lo fija
 * automáticamente.
 */
export const requireLocalGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const active = inject(ActiveRestaurantService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.parseUrl('/ingresar');
  }

  if (!active.loaded()) {
    await active.load();
  }

  if (active.needsSelection()) {
    return router.parseUrl('/seleccionar-local');
  }

  return true;
};
