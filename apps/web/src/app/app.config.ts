import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { restaurantInterceptor } from './core/interceptors/restaurant.interceptor';
import { ActiveRestaurantService } from './core/services/active-restaurant.service';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, restaurantInterceptor, errorInterceptor])),

    /**
     * Antes de que el router cargue la primera ruta, intenta rehidratar la
     * sesión con la cookie httpOnly. Si tiene éxito, el access token queda
     * en memoria y el `Authorization: Bearer` se añade a las llamadas
     * siguientes. Si falla, el usuario verá /ingresar (gestionado por authGuard).
     *
     * Hacerlo aquí (en lugar de en App.ngOnInit) garantiza que ninguna
     * llamada a la API se dispare antes de que el access token esté listo.
     */
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [AuthService, ActiveRestaurantService, ThemeService],
      useFactory:
        (auth: AuthService, active: ActiveRestaurantService, theme: ThemeService) =>
        async () => {
          const ok = await auth.bootstrap();
          if (ok) {
            await active.load();
          } else {
            void theme.loadTenant();
          }
        },
    },
  ],
};
