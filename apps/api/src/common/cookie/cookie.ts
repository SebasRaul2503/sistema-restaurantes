import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';

export const REFRESH_COOKIE_NAME = 'refresh_token';

/** Devuelve las opciones de cookie según el entorno (prod vs dev). */
function cookieOptions(configService: ConfigService): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'strict' | 'lax';
  path: string;
  maxAge: number;
} {
  const isProd = configService.get<boolean>('isProduction') ?? false;
  const maxAgeSeconds = configService.get<number>('cookie.maxAgeSeconds') ?? 7 * 24 * 60 * 60;
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/api/auth',
    maxAge: maxAgeSeconds * 1000,
  };
}

/**
 * Setea la cookie httpOnly con el refresh token. La cookie va con `path: /api/auth`
 * para reducir la superficie de exposición (no se envía a endpoints que no la
 * necesitan).
 */
export function setRefreshCookie(
  res: Response,
  configService: ConfigService,
  token: string,
): void {
  res.cookie(REFRESH_COOKIE_NAME, token, cookieOptions(configService));
}

/** Limpia la cookie httpOnly del refresh token. */
export function clearRefreshCookie(res: Response, configService: ConfigService): void {
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions(configService));
}
