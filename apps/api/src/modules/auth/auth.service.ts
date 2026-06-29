import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { LoginResponse, MeResponse, UserRole } from '@restaurante/shared-types';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { JwtPayload } from './strategies/jwt.strategy';

export interface RefreshJwtPayload extends JwtPayload {
  jti: string;
}

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

    const { accessToken, refreshToken } = await this.issueTokens(
      user.id,
      user.email,
      user.role as UserRole,
    );
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role as UserRole },
    };
  }

  /**
   * Renueva el access token rotando el refresh: el jti anterior se marca
   * como revocado y se emite uno nuevo. Si el jti no existe, está revocado
   * o expiró, se rechaza.
   */
  async refresh(refreshTokenJwt: string): Promise<LoginResponse> {
    let payload: RefreshJwtPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshJwtPayload>(refreshTokenJwt, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Sesión expirada, inicie sesión nuevamente.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) {
      throw new UnauthorizedException('Sesión no válida.');
    }

    const stored = await this.prisma.refreshToken.findUnique({ where: { jti: payload.jti } });
    if (!stored || stored.revokedAt !== null || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Sesión inválida o revocada.');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role as UserRole);
    await this.prisma.refreshToken.update({
      where: { jti: tokens.jti },
      data: { replacedById: stored.jti },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role as UserRole },
    };
  }

  /**
   * Revoca el refresh token presentado. Si no se presenta ninguno, revoca
   * todos los activos del usuario (logout total).
   */
  async logout(userId: string, refreshTokenJwt?: string): Promise<void> {
    if (refreshTokenJwt) {
      try {
        const payload = await this.jwt.verifyAsync<RefreshJwtPayload>(refreshTokenJwt, {
          secret: this.config.get<string>('jwt.refreshSecret'),
        });
        await this.prisma.refreshToken.updateMany({
          where: { jti: payload.jti, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      } catch {
        // Token inválido o expirado: ignorar, igual limpiamos la cookie en el cliente.
      }
    } else {
      // Logout total: revoca todos los refresh activos del usuario.
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.audit.record({
      userId,
      action: 'USER_LOGOUT',
      entity: 'User',
      entityId: userId,
    });
  }

  /**
   * Emite un access token (vida corta, en memoria en el cliente) y un refresh
   * token (vida larga, en cookie httpOnly). El jti del refresh se persiste en
   * DB para soportar rotación.
   */
  private async issueTokens(
    sub: string,
    email: string,
    role: UserRole,
  ): Promise<{ accessToken: string; refreshToken: string; jti: string }> {
    const accessPayload: JwtPayload = { sub, email, role };
    const jti = randomUUID();
    const refreshPayload: RefreshJwtPayload = { sub, email, role, jti };

    const expiresIn = this.config.get<string>('jwt.refreshExpiresIn') ?? '7d';
    const expiresAt = this.parseExpiry(expiresIn);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn,
      }),
    ]);

    await this.prisma.refreshToken.create({
      data: {
        jti,
        userId: sub,
        expiresAt,
      },
    });

    return { accessToken, refreshToken, jti };
  }

  /** Convierte "7d" / "15m" / "3600s" a un Date futuro. */
  private parseExpiry(value: string): Date {
    const match = /^(\d+)\s*(s|m|h|d)?$/.exec(value.trim());
    const n = match ? parseInt(match[1], 10) : 7;
    const unit = match?.[2];
    const seconds =
      unit === 's' ? n : unit === 'm' ? n * 60 : unit === 'h' ? n * 3600 : n * 86400;
    return new Date(Date.now() + seconds * 1000);
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
