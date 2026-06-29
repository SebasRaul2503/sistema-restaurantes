import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { KitchenItemDto, OrderItemStatus } from '@restaurante/shared-types';
import { KitchenApi } from '../../core/data/kitchen.api';
import { ActiveRestaurantService } from '../../core/services/active-restaurant.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-kitchen',
  standalone: true,
  imports: [],
  templateUrl: './kitchen.html',
  styleUrl: './kitchen.scss',
})
export class KitchenPage implements OnInit, OnDestroy {
  private readonly kitchen = inject(KitchenApi);
  private readonly active = inject(ActiveRestaurantService);
  private readonly notify = inject(NotificationService);

  readonly OrderItemStatus = OrderItemStatus;

  readonly items = signal<KitchenItemDto[]>([]);
  readonly loading = signal(true);
  /** Marca de tiempo que fuerza el recálculo de los tiempos de espera. */
  readonly now = signal(Date.now());

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  readonly pending = computed(() =>
    this.items().filter((it) => it.status === OrderItemStatus.PENDIENTE),
  );
  readonly preparing = computed(() =>
    this.items().filter((it) => it.status === OrderItemStatus.PREPARANDO),
  );

  constructor() {
    // Recarga cuando cambia el local activo (y al instanciarse, para la
    // primera carga). El timer periódico sigue corriendo en paralelo.
    effect(() => {
      this.active.activeRestaurantId();
      void this.refresh();
    });
  }

  ngOnInit(): void {
    this.refreshTimer = setInterval(() => {
      this.now.set(Date.now());
      void this.refresh();
    }, 15000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer !== null) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      this.now.set(Date.now());
      this.items.set(await this.kitchen.queue());
    } catch {
      // El interceptor global muestra el error como toast.
    } finally {
      this.loading.set(false);
    }
  }

  async start(item: KitchenItemDto): Promise<void> {
    await this.change(item.id, OrderItemStatus.PREPARANDO, 'Plato enviado a preparación');
  }

  async deliver(item: KitchenItemDto): Promise<void> {
    await this.change(item.id, OrderItemStatus.ENTREGADO, 'Plato marcado como entregado');
  }

  async back(item: KitchenItemDto): Promise<void> {
    await this.change(item.id, OrderItemStatus.PENDIENTE, 'Plato regresado a pendientes');
  }

  private async change(id: string, status: OrderItemStatus, message: string): Promise<void> {
    try {
      await this.kitchen.changeStatus(id, status);
      await this.refresh();
      this.notify.success(message);
    } catch {
      // El interceptor global muestra el error como toast.
    }
  }

  /** Tiempo de espera relativo en minutos, p. ej. "hace 4 min". */
  waitingLabel(createdAt: string): string {
    const diffMs = this.now() - new Date(createdAt).getTime();
    const minutes = Math.max(0, Math.floor(diffMs / 60000));
    if (minutes < 1) return 'recién';
    return `hace ${minutes} min`;
  }
}
