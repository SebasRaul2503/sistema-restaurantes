import { Pipe, PipeTransform } from '@angular/core';

/** Formatea un monto en soles peruanos: 34 -> "S/ 34.00". */
@Pipe({ name: 'soles', standalone: true })
export class SolesPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    const amount = value ?? 0;
    return `S/ ${amount.toFixed(2)}`;
  }
}
