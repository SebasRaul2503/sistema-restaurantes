import { Component, effect, input, output, signal } from '@angular/core';

/**
 * Campo de fecha con formato **dd/mm/aaaa** (estándar peruano).
 * - Muestra y acepta la fecha como dd/mm/aaaa.
 * - Expone el valor en ISO `yyyy-mm-dd` (entrada/salida), que es lo que consume
 *   la API. Cadena vacía cuando la fecha está incompleta o no es válida.
 *
 * Uso:  <app-date-field [value]="from()" (valueChange)="from.set($event)" />
 */
@Component({
  selector: 'app-date-field',
  standalone: true,
  templateUrl: './date-field.html',
  styleUrl: './date-field.scss',
})
export class DateField {
  /** Valor en ISO (yyyy-mm-dd) o ''. */
  readonly value = input<string>('');
  readonly placeholder = input<string>('dd/mm/aaaa');
  readonly id = input<string | undefined>(undefined);

  /** Emite el valor en ISO (yyyy-mm-dd) o '' si está incompleto/inválido. */
  readonly valueChange = output<string>();

  /** Texto mostrado (dd/mm/aaaa). */
  readonly text = signal('');
  private focused = false;

  constructor() {
    // Sincroniza desde el valor externo (ISO) solo cuando el campo no está en
    // edición, para no interferir con lo que el usuario escribe.
    effect(
      () => {
        const iso = this.value();
        if (!this.focused) {
          this.text.set(isoToDisplay(iso));
        }
      },
      { allowSignalWrites: true },
    );
  }

  onFocus(): void {
    this.focused = true;
  }
  onBlur(): void {
    this.focused = false;
    // Al salir, normaliza el texto a partir del valor válido (o lo limpia).
    this.text.set(isoToDisplay(this.value()));
  }

  onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const formatted = formatTyping(raw);
    this.text.set(formatted);
    this.valueChange.emit(displayToIso(formatted));
  }
}

/** '2026-06-15' -> '15/06/2026' ; '' o inválido -> ''. */
function isoToDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** '15/06/2026' -> '2026-06-15' ; incompleto/inválido -> ''. */
function displayToIso(display: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display);
  if (!m) return '';
  const day = +m[1];
  const month = +m[2];
  const year = +m[3];
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  // Verifica que sea una fecha real (p. ej. rechaza 31/02).
  const d = new Date(`${iso}T00:00:00`);
  if (d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day || d.getUTCFullYear() !== year) {
    return '';
  }
  return iso;
}

/** Inserta las barras automáticamente mientras se escribe. */
function formatTyping(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter((p) => p.length > 0);
  return parts.join('/');
}
