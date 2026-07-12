import { Injectable, signal } from '@angular/core';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmOptions {
  title: string;
  message: string;
  /** Etiqueta del botón principal. Default: "Confirmar". */
  confirmText?: string;
  /** Etiqueta del botón secundario. Default: "Cancelar". */
  cancelText?: string;
  /** Variante visual del botón principal. Default: 'danger'. */
  variant?: ConfirmVariant;
}

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: ConfirmVariant;
  resolve: ((value: boolean) => void) | null;
}

/**
 * Servicio de confirmación con diálogo modal coherente con el sistema de
 * diseño. Reemplaza los `window.confirm()` del navegador (que rompen la
 * estética y no son configurables).
 *
 * Uso: `if (!await this.confirm.confirm({ title, message })) return;`
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly state = signal<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    variant: 'danger',
    resolve: null,
  });

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.state.set({
        open: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText ?? 'Confirmar',
        cancelText: options.cancelText ?? 'Cancelar',
        variant: options.variant ?? 'danger',
        resolve,
      });
    });
  }

  /** Resuelve true (confirmado). Llamado por el botón principal del diálogo. */
  accept(): void {
    const s = this.state();
    if (s.resolve) s.resolve(true);
    this.state.set({ ...s, open: false, resolve: null });
  }

  /** Resuelve false (cancelado). Llamado por Cancelar, backdrop o Escape. */
  cancel(): void {
    const s = this.state();
    if (s.resolve) s.resolve(false);
    this.state.set({ ...s, open: false, resolve: null });
  }
}
