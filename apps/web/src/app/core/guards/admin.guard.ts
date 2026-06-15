import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/** Restringe rutas a administradores. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notify = inject(NotificationService);
  if (auth.isAdmin()) {
    return true;
  }
  notify.error('Solo el administrador puede acceder a esta sección.');
  return router.parseUrl('/panel');
};
