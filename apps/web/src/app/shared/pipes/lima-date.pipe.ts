import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';

const LIMA_TZ = 'America/Lima';

@Pipe({ name: 'limaDate', standalone: true })
export class LimaDatePipe implements PipeTransform {
  private readonly delegate = new DatePipe('es-PE');

  transform(
    value: string | Date | null | undefined,
    format?: string,
  ): string | null {
    if (value == null) return null;
    return this.delegate.transform(value, format ?? 'short', LIMA_TZ);
  }
}
