import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@restaurante/shared-types';

export interface RequestUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

/** Inyecta el usuario autenticado (poblado por JwtStrategy) en el controlador. */
export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as RequestUser;
    return data ? user?.[data] : user;
  },
);
