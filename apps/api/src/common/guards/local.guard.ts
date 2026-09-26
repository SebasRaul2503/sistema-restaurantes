import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../core/prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_RESTAURANT_KEY } from '../decorators/skip-restaurant.decorator';

/**
 * Resuelve y valida el local activo de la petición. Lee el `restaurantId` de
 * (en orden):
 *   1. Header `X-Restaurant-Id`
 *   2. Query param `?restaurantId=`
 *
 * Valida que el usuario autenticado pertenece al local (membresía activa), o
 * que es superadmin (rol ADMIN sin membresías). En rutas con `@SkipRestaurant()`
 * o `@Public()` no exige local y deja `request.restaurant = undefined`.
 *
 * Persistencia: si el id resuelto es válido, actualiza `user.lastRestaurantId`
 * solo si difiere del actual (updateMany con where `not`). Permite que la
 * sesión se rehidrate con el mismo local tras recargar la pestaña.
 */
@Injectable()
export class LocalGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const skipRestaurant = this.reflector.getAllAndOverride<boolean>(SKIP_RESTAURANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic || skipRestaurant) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { id: string; role: 'ADMIN' | 'OPERATOR' } | undefined;
    if (!user) {
      throw new ForbiddenException('No autenticado.');
    }

    const headerId = request.headers?.['x-restaurant-id'];
    const queryId = request.query?.restaurantId;
    const requestedId = (headerId || queryId) as string | undefined;

    if (!requestedId) {
      request.restaurant = undefined;
      return true;
    }

    const isSuperAdmin =
      user.role === 'ADMIN' &&
      (await this.prisma.restaurantMember.count({ where: { userId: user.id } })) === 0;

    if (isSuperAdmin) {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { id: requestedId },
        select: { id: true, active: true },
      });
      if (!restaurant) throw new ForbiddenException('Local no encontrado.');
      if (!restaurant.active) {
        throw new ForbiddenException('El local está desactivado.');
      }
      request.restaurant = { id: requestedId, isSuperAdmin: true };
      await this.persistLastRestaurant(user.id, requestedId);
      return true;
    }

    // Traemos también el restaurante para validar `active`. Si el local fue
    // desactivado, rechazamos incluso si la membresía sigue activa.
    const member = await this.prisma.restaurantMember.findUnique({
      where: { userId_restaurantId: { userId: user.id, restaurantId: requestedId } },
      include: { restaurant: { select: { active: true } } },
    });
    if (!member || !member.active) {
      throw new ForbiddenException('No tiene acceso a este local.');
    }
    if (!member.restaurant.active) {
      throw new ForbiddenException('El local está desactivado.');
    }

    request.restaurant = { id: requestedId, isSuperAdmin: false };
    await this.persistLastRestaurant(user.id, requestedId);
    return true;
  }

  /** Actualiza `user.lastRestaurantId` solo si difiere del actual. */
  private async persistLastRestaurant(userId: string, restaurantId: string): Promise<void> {
    try {
      // Leemos solo el campo necesario (1 query). Si difiere, escribimos (2da query).
      // Evitamos el `updateMany` con `NOT` por un bug de Prisma con NULL + NOT
      // que no actualiza cuando el campo es null.
      const current = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { lastRestaurantId: true },
      });
      if (current?.lastRestaurantId === restaurantId) return;
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastRestaurantId: restaurantId },
      });
    } catch {
      // La persistencia del local activo no debe romper el request principal.
    }
  }
}
