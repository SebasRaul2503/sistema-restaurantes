import { SetMetadata } from '@nestjs/common';

export const SKIP_RESTAURANT_KEY = 'skipRestaurant';

/**
 * Marca una ruta que no requiere `restaurantId` activo. El `LocalGuard` la
 * deja pasar sin asignar `request.restaurant`.
 *
 * Se usa en endpoints de gestión de locales y membresías (p. ej. crear un local
 * no requiere estar en un local) y en `/api/auth/me`.
 */
export const SkipRestaurant = () => SetMetadata(SKIP_RESTAURANT_KEY, true);
