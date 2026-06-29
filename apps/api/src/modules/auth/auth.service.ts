import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginResponse, MeResponse, UserRole } from '@restaurante/shared-types';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly restaurants: RestaurantsService,
  ) {}

  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    await this.audit.record({
      userId: user.id,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id,
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role as UserRole);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name, role: user.role as UserRole },
    };
  }

  async refresh(refreshToken: string): Promise<LoginResponse> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Sesión expirada, inicie sesión nuevamente.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) {
      throw new UnauthorizedException('Sesión no válida.');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role as UserRole);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name, role: user.role as UserRole },
    };
  }

  private async issueTokens(sub: string, email: string, role: UserRole) {
    const payload: JwtPayload = { sub, email, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  /**
   * Devuelve la información del usuario para `/auth/me` junto con sus locales
   * y el local activo (si la petición trae `X-Restaurant-Id` y el usuario
   * tiene acceso).
   */
  async me(userId: string, role: UserRole, activeRestaurantId: string | null): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Sesión no válida.');
    }

    const restaurants = await this.restaurants.listForUser(userId, role);
    const memberCount = await this.prisma.restaurantMember.count({ where: { userId } });
    const isSuperAdmin = role === 'ADMIN' && memberCount === 0;

    // Verificar que el activeRestaurantId sigue siendo válido para el usuario.
    let resolvedActive: string | null = null;
    if (activeRestaurantId) {
      const allowed = isSuperAdmin
        ? await this.prisma.restaurant.findUnique({ where: { id: activeRestaurantId } })
        : await this.prisma.restaurantMember.findUnique({
            where: { userId_restaurantId: { userId, restaurantId: activeRestaurantId } },
          });
      if (allowed) {
        const isMember = isSuperAdmin ? true : (allowed as { active: boolean }).active;
        if (isMember) resolvedActive = activeRestaurantId;
      }
    }

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role as UserRole },
      restaurants,
      activeRestaurantId: resolvedActive,
      isSuperAdmin,
    };
  }
}
