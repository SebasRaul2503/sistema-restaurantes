import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  OrderSummaryDto,
  TableDto,
  TableStatus,
} from '@restaurante/shared-types';
import { TablesApi } from '../../core/data/tables.api';
import { OrdersApi } from '../../core/data/orders.api';
import { AuthService } from '../../core/services/auth.service';
import { ActiveRestaurantService } from '../../core/services/active-restaurant.service';
import { NotificationService } from '../../core/services/notification.service';
import { EnumLabelPipe } from '../../shared/pipes/enum-label.pipe';
import { SolesPipe } from '../../shared/pipes/soles.pipe';

interface TableCard extends TableDto {
  order: OrderSummaryDto | null;
}

interface NewTableForm {
  number: number | null;
  name: string;
  capacity: number | null;
}

interface EditTableForm {
  name: string;
  capacity: number | null;
}

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [FormsModule, EnumLabelPipe, SolesPipe],
  templateUrl: './tables.html',
  styleUrl: './tables.scss',
})
export class TablesPage {
  private readonly tablesApi = inject(TablesApi);
  private readonly ordersApi = inject(OrdersApi);
  private readonly auth = inject(AuthService);
  private readonly active = inject(ActiveRestaurantService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  readonly isAdmin = this.auth.isAdmin;

  readonly tables = signal<TableDto[]>([]);
  readonly orders = signal<OrderSummaryDto[]>([]);
  readonly loading = signal(true);

  /** Estados disponibles para el selector por mesa. */
  readonly statuses = Object.values(TableStatus);

  /** Mesas con su pedido activo (si lo hay) ya enlazado. */
  readonly cards = computed<TableCard[]>(() => {
    const byTable = new Map<string, OrderSummaryDto>();
    for (const order of this.orders()) {
      byTable.set(order.tableId, order);
    }
    return this.tables().map((table) => ({
      ...table,
      order: byTable.get(table.id) ?? null,
    }));
  });

  /** Conteo de mesas por estado para las fichas de resumen. */
  readonly counts = computed(() => {
    const acc: Record<TableStatus, number> = {
      [TableStatus.LIBRE]: 0,
      [TableStatus.OCUPADA]: 0,
      [TableStatus.RESERVADA]: 0,
      [TableStatus.FUERA_DE_SERVICIO]: 0,
    };
    for (const table of this.tables()) {
      acc[table.status]++;
    }
    return acc;
  });

  // Estados de UI para formularios de administración.
  readonly showAddForm = signal(false);
  readonly newTable = signal<NewTableForm>({ number: null, name: '', capacity: null });
  readonly editingId = signal<string | null>(null);
  readonly editForm = signal<EditTableForm>({ name: '', capacity: null });

  readonly TableStatus = TableStatus;

  constructor() {
    effect(() => {
      this.active.activeRestaurantId();
      untracked(() => void this.refresh());
    });
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const [tables, orders] = await Promise.all([
        this.tablesApi.list(),
        this.ordersApi.active(),
      ]);
      this.tables.set(tables);
      this.orders.set(orders);
    } catch {
      // El interceptor global muestra el toast de error.
    } finally {
      this.loading.set(false);
    }
  }

  /** Clase del badge según el estado de la mesa. */
  badgeClass(status: TableStatus): string {
    switch (status) {
      case TableStatus.LIBRE:
        return 'badge-success';
      case TableStatus.OCUPADA:
        return 'badge-danger';
      case TableStatus.RESERVADA:
        return 'badge-warning';
      case TableStatus.FUERA_DE_SERVICIO:
        return 'badge-muted';
    }
  }

  /** Clic en una mesa: abre/continúa su pedido. */
  async onCardClick(card: TableCard): Promise<void> {
    if (this.editingId() === card.id) return;
    if (card.status === TableStatus.FUERA_DE_SERVICIO) return;

    if (card.order) {
      void this.router.navigate(['/pedidos', card.order.id]);
      return;
    }
    if (card.status === TableStatus.LIBRE) {
      try {
        const order = await this.ordersApi.create(card.id);
        this.notify.success(`Pedido abierto para la mesa ${card.number}`);
        void this.router.navigate(['/pedidos', order.id]);
      } catch {
        // Toast de error vía interceptor.
      }
    }
  }

  async onStatusChange(card: TableCard, status: TableStatus): Promise<void> {
    if (status === card.status) return;
    try {
      await this.tablesApi.changeStatus(card.id, status);
      this.notify.success(`Mesa ${card.number} actualizada`);
      await this.refresh();
    } catch {
      // Toast de error vía interceptor.
    }
  }

  // Setters de campo (las plantillas de Angular no admiten literales de objeto).
  setNewNumber(v: number | null): void { this.newTable.update((f) => ({ ...f, number: v })); }
  setNewName(v: string): void { this.newTable.update((f) => ({ ...f, name: v })); }
  setNewCapacity(v: number | null): void { this.newTable.update((f) => ({ ...f, capacity: v })); }
  setEditName(v: string): void { this.editForm.update((f) => ({ ...f, name: v })); }
  setEditCapacity(v: number | null): void { this.editForm.update((f) => ({ ...f, capacity: v })); }

  // --- Administración: agregar mesa ---

  toggleAddForm(): void {
    this.showAddForm.update((open) => !open);
    if (this.showAddForm()) {
      this.newTable.set({ number: null, name: '', capacity: null });
    }
  }

  async createTable(): Promise<void> {
    const form = this.newTable();
    if (form.number === null) return;
    try {
      await this.tablesApi.create({
        number: form.number,
        name: form.name.trim() || undefined,
        capacity: form.capacity ?? undefined,
      });
      this.notify.success(`Mesa ${form.number} creada`);
      this.showAddForm.set(false);
      await this.refresh();
    } catch {
      // Toast de error vía interceptor.
    }
  }

  // --- Administración: editar / desactivar mesa ---

  startEdit(card: TableCard): void {
    this.editingId.set(card.id);
    this.editForm.set({ name: card.name ?? '', capacity: card.capacity });
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  async saveEdit(card: TableCard): Promise<void> {
    const form = this.editForm();
    try {
      await this.tablesApi.update(card.id, {
        name: form.name.trim() || undefined,
        capacity: form.capacity ?? undefined,
      });
      this.notify.success(`Mesa ${card.number} actualizada`);
      this.editingId.set(null);
      await this.refresh();
    } catch {
      // Toast de error vía interceptor.
    }
  }

  async removeTable(card: TableCard): Promise<void> {
    try {
      await this.tablesApi.remove(card.id);
      this.notify.success(`Mesa ${card.number} desactivada`);
      this.editingId.set(null);
      await this.refresh();
    } catch {
      // Toast de error vía interceptor.
    }
  }
}
