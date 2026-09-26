import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

export const REFRESH_COOKIE_NAME = 'refresh_token';

/**
 * Resuelve si la cookie debe llevar flag `Secure` basándose en:
 * 1. La variable de entorno `COOKIE_SECURE` si está definida (override
 *    explícito para forzar el comportamiento en un entorno dado).
 * 2. El scheme de la request entrante: `X-Forwarded-Proto: https` (proxy
 *    reverso con TLS en frente) o conexión directa `req.secure`.
 * 3. Si nada de lo anterior aplica, la cookie NO es Secure (modo seguro por
 *    defecto: en HTTP no se puede garantizar la cookie Secure, y si la
 *    seteamos igual, el navegador la aceptará en algunos casos y la
 *    rechazará/enviará en otros, comportamiento inconsistente).
 */
function isSecureRequest(req: Request): boolean {
  const override = process.env.COOKIE_SECURE;
  if (override === 'true') return true;
  if (override === 'false') return false;
  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)
    ?.split(',')[0]
    ?.trim()
    ?.toLowerCase();
  if (forwardedProto === 'https') return true;
  if (forwardedProto === 'http') return false;
  return req.secure === true;
}

function cookieOptions(req: Request, configService: ConfigService): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'strict' | 'lax';
  path: string;
  maxAge: number;
} {
  const maxAgeSeconds = configService.get<number>('cookie.maxAgeSeconds') ?? 7 * 24 * 60 * 60;
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    secure,
    // En dev (HTTP), sameSite=strict hace que la cookie no se envíe en
    // muchas peticiones cross-origin. Lax es más permisivo y suficiente
    // para localhost.
    sameSite: secure ? 'strict' : 'lax',
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
  req: Request,
  res: Response,
  configService: ConfigService,
  token: string,
): void {
  res.cookie(REFRESH_COOKIE_NAME, token, cookieOptions(req, configService));
}

/** Limpia la cookie httpOnly del refresh token. */
export function clearRefreshCookie(
  req: Request,
  res: Response,
  configService: ConfigService,
): void {
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions(req, configService));
}
