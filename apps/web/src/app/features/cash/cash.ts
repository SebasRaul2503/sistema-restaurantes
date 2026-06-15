import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CashMovementType, CashSessionDto, CashSessionStatus } from '@restaurante/shared-types';
import { CashApi } from '../../core/data/cash.api';
import { NotificationService } from '../../core/services/notification.service';
import { SolesPipe } from '../../shared/pipes/soles.pipe';
import { EnumLabelPipe } from '../../shared/pipes/enum-label.pipe';

@Component({
  selector: 'app-cash',
  standalone: true,
  imports: [FormsModule, DatePipe, SolesPipe, EnumLabelPipe],
  templateUrl: './cash.html',
  styleUrl: './cash.scss',
})
export class CashPage implements OnInit {
  private readonly cash = inject(CashApi);
  private readonly notify = inject(NotificationService);

  readonly movementTypes = CashMovementType;
  readonly sessionStatus = CashSessionStatus;

  readonly current = signal<CashSessionDto | null>(null);
  readonly history = signal<CashSessionDto[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly isOpen = computed(() => {
    const c = this.current();
    return !!c && c.status === CashSessionStatus.ABIERTA;
  });

  /** Resultado del último cierre para mostrar el resumen esperado vs real. */
  readonly lastClosed = signal<CashSessionDto | null>(null);

  // Formularios
  openingAmount: number | null = null;

  movementType: CashMovementType = CashMovementType.INGRESO;
  movementAmount: number | null = null;
  movementDescription = '';

  actualAmount: number | null = null;
  closeNotes = '';

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const [current, history] = await Promise.all([this.cash.current(), this.cash.history()]);
      this.current.set(current);
      this.history.set(history);
    } finally {
      this.loading.set(false);
    }
  }

  async openCash(): Promise<void> {
    if (this.openingAmount == null || this.openingAmount < 0) return;
    this.saving.set(true);
    try {
      await this.cash.open(this.openingAmount);
      this.openingAmount = null;
      this.lastClosed.set(null);
      await this.reload();
      this.notify.success('Caja abierta');
    } catch {
      // El interceptor muestra el toast de error.
    } finally {
      this.saving.set(false);
    }
  }

  async addMovement(): Promise<void> {
    if (this.movementAmount == null || this.movementAmount <= 0 || !this.movementDescription.trim()) return;
    this.saving.set(true);
    try {
      await this.cash.addMovement(this.movementType, this.movementAmount, this.movementDescription.trim());
      this.movementType = CashMovementType.INGRESO;
      this.movementAmount = null;
      this.movementDescription = '';
      await this.reload();
      this.notify.success('Movimiento registrado');
    } catch {
      // El interceptor muestra el toast de error.
    } finally {
      this.saving.set(false);
    }
  }

  async closeCash(): Promise<void> {
    if (this.actualAmount == null || this.actualAmount < 0) return;
    this.saving.set(true);
    try {
      const closed = await this.cash.close(this.actualAmount, this.closeNotes.trim() || undefined);
      this.actualAmount = null;
      this.closeNotes = '';
      this.lastClosed.set(closed);
      await this.reload();
      this.notify.success('Caja cerrada');
    } catch {
      // El interceptor muestra el toast de error.
    } finally {
      this.saving.set(false);
    }
  }

  /** Clase de badge para el tipo de movimiento. */
  movementBadge(type: CashMovementType): string {
    return type === CashMovementType.INGRESO ? 'badge-success' : 'badge-danger';
  }

  /** Etiqueta del estado de la diferencia de una sesión cerrada. */
  diffLabel(difference: number | null): string {
    const d = difference ?? 0;
    if (d < 0) return 'Faltante';
    if (d > 0) return 'Sobrante';
    return 'Cuadrado';
  }

  /** Clase de badge para la diferencia. */
  diffBadge(difference: number | null): string {
    const d = difference ?? 0;
    if (d < 0) return 'badge-danger';
    if (d > 0) return 'badge-warning';
    return 'badge-success';
  }
}
