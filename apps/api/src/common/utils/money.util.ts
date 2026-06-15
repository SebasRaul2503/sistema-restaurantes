import { Prisma } from '@prisma/client';

/**
 * Utilidades de dinero. Los montos se guardan como Decimal en la base y se
 * exponen como number (soles) en la API. Se redondea a 2 decimales para evitar
 * errores de coma flotante.
 */
export type DecimalLike = Prisma.Decimal | number | string | null | undefined;

export function toNumber(value: DecimalLike): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return Number(value);
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
