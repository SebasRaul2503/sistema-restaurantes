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
      const exists = await this.prisma.restaurant.findUnique({ where: { id: requestedId } });
      if (!exists) throw new ForbiddenException('Local no encontrado.');
      request.restaurant = { id: requestedId, isSuperAdmin: true };
      return true;
    }

    const member = await this.prisma.restaurantMember.findUnique({
      where: { userId_restaurantId: { userId: user.id, restaurantId: requestedId } },
    });
    if (!member || !member.active) {
      throw new ForbiddenException('No tiene acceso a este local.');
    }

    request.restaurant = { id: requestedId, isSuperAdmin: false };
    return true;
  }
}
