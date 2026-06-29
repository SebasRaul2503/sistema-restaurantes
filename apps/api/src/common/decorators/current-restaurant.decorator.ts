import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface RequestRestaurant {
  id: string;
  /** true si el usuario es superadmin (ADMIN sin membresías). */
  isSuperAdmin: boolean;
}

/**
 * Inyecta el `restaurantId` resuelto en la petición. El `LocalGuard` lo asigna
 * a `request.restaurant` desde el header `X-Restaurant-Id` o query param
 * `?restaurantId=` después de validar el acceso del usuario.
 */
export const CurrentRestaurant = createParamDecorator(
  (
    data: keyof RequestRestaurant | undefined,
    ctx: ExecutionContext,
  ): RequestRestaurant | string | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const restaurant = request.restaurant as RequestRestaurant | undefined;
    if (data === 'id') return restaurant?.id;
    return data
      ? (restaurant as unknown as Record<string, unknown> | undefined)?.[data]
      : restaurant;
  },
);
