import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@restaurante/shared-types';

export const ROLES_KEY = 'roles';

/** Restringe una ruta a los roles indicados (usado por RolesGuard). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
