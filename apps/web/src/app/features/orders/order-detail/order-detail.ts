import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  DishDto,
  MenuCategoryDto,
  OrderDto,
  OrderItemDto,
  OrderStatus,
  PaymentMethod,
} from '@restaurante/shared-types';
import { OrdersApi } from '../../../core/data/orders.api';
import { MenuApi } from '../../../core/data/menu.api';
import { ActiveRestaurantService } from '../../../core/services/active-restaurant.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SolesPipe } from '../../../shared/pipes/soles.pipe';
import { EnumLabelPipe } from '../../../shared/pipes/enum-label.pipe';

interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
}

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [FormsModule, SolesPipe, EnumLabelPipe],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetailPage {
  private readonly ordersApi = inject(OrdersApi);
  private readonly menuApi = inject(MenuApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly active = inject(ActiveRestaurantService);
  private readonly notify = inject(NotificationService);

  readonly OrderStatus = OrderStatus;

  private orderId = '';
  readonly order = signal<OrderDto | null>(null);
  readonly loading = signal(true);

  // Carta para agregar platos
  readonly categories = signal<MenuCategoryDto[]>([]);
  readonly dishes = signal<DishDto[]>([]);
  readonly selectedCategory = signal<string>('');
  readonly filteredDishes = computed(() => {
    const cat = this.selectedCategory();
    return this.dishes().filter((d) => d.active && (!cat || d.categoryId === cat));
  });
  readonly itemNotes = signal('');

  // Corrección de plato entregado
  readonly replacingItem = signal<OrderItemDto | null>(null);
  readonly replaceReason = signal('');

  // División de cuenta
  readonly evenParts = signal(2);
  readonly byItemsMode = signal(false);
  readonly byItemsGroupCount = signal(2);
  readonly itemAssign = signal<Record<string, number>>({});

  // Pago
  readonly paymentMethods: PaymentMethodOption[] = [
    { value: PaymentMethod.EFECTIVO, label: 'Efectivo' },
    { value: PaymentMethod.YAPE, label: 'Yape' },
    { value: PaymentMethod.PLIN, label: 'Plin' },
    { value: PaymentMethod.TARJETA, label: 'Tarjeta' },
  ];
  readonly payMethod = signal<PaymentMethod>(PaymentMethod.EFECTIVO);
  readonly payAmount = signal<number>(0);
  readonly payReference = signal('');
  readonly payBillGroupId = signal<string>('');

  readonly activeItems = computed(() => this.order()?.items.filter((i) => !i.isModified) ?? []);

  constructor() {
    this.orderId = this.route.snapshot.paramMap.get('orderId') ?? '';
    effect(() => {
      this.active.activeRestaurantId();
      void this.load();
    });
  }

  back(): void {
    void this.router.navigate(['/mesas']);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [order, categories, dishes] = await Promise.all([
        this.ordersApi.get(this.orderId),
        this.menuApi.listCategories(),
        this.menuApi.listDishes({ active: true }),
      ]);
      this.setOrder(order);
      this.categories.set(categories);
      this.dishes.set(dishes);
    } catch {
      /* interceptor muestra el error */
    } finally {
      this.loading.set(false);
    }
  }

  private setOrder(order: OrderDto): void {
    this.order.set(order);
    // Por defecto, el monto a cobrar es el saldo pendiente del pedido.
    this.payAmount.set(order.balance);
    if (order.status === OrderStatus.CERRADA) {
      this.notify.success('Pedido pagado y cerrado.');
      setTimeout(() => void this.router.navigate(['/mesas']), 1200);
    }
  }

  // ---- Ítems ----
  async addDish(dish: DishDto): Promise<void> {
    const order = await this.ordersApi.addItem(this.orderId, {
      dishId: dish.id,
      quantity: 1,
      notes: this.itemNotes() || undefined,
    });
    this.itemNotes.set('');
    this.setOrder(order);
    this.notify.success(`${dish.name} agregado.`);
  }

  async changeQty(item: OrderItemDto, delta: number): Promise<void> {
    const next = item.quantity + delta;
    if (next < 1) {
      await this.removeItem(item);
      return;
    }
    this.setOrder(await this.ordersApi.updateItem(item.id, { quantity: next }));
  }

  async saveNotes(item: OrderItemDto, notes: string): Promise<void> {
    this.setOrder(await this.ordersApi.updateItem(item.id, { notes }));
    this.notify.success('Nota actualizada.');
  }

  async removeItem(item: OrderItemDto): Promise<void> {
    this.setOrder(await this.ordersApi.removeItem(item.id));
  }

  openReplace(item: OrderItemDto): void {
    this.replacingItem.set(item);
    this.replaceReason.set('');
  }
  cancelReplace(): void {
    this.replacingItem.set(null);
  }
  async confirmReplace(): Promise<void> {
    const item = this.replacingItem();
    if (!item) return;
    const order = await this.ordersApi.replaceItem(item.id, {
      reason: this.replaceReason() || undefined,
    });
    this.replacingItem.set(null);
    this.setOrder(order);
    this.notify.success('Se creó un reemplazo y volvió a cocina.');
  }

  async cancelOrder(): Promise<void> {
    if (!confirm('¿Anular este pedido? Esta acción libera la mesa.')) return;
    await this.ordersApi.cancel(this.orderId);
    this.notify.success('Pedido anulado.');
    void this.router.navigate(['/mesas']);
  }

  // ---- División de cuenta ----
  async splitEven(): Promise<void> {
    this.setOrder(await this.ordersApi.splitEven(this.orderId, this.evenParts()));
    this.notify.success(`Cuenta dividida en ${this.evenParts()} partes.`);
  }
  async clearSplit(): Promise<void> {
    this.setOrder(await this.ordersApi.clearSplit(this.orderId));
    this.byItemsMode.set(false);
    this.notify.success('División eliminada.');
  }

  toggleByItems(): void {
    this.byItemsMode.update((v) => !v);
    this.itemAssign.set({});
  }
  assignItem(itemId: string, group: number): void {
    this.itemAssign.update((m) => ({ ...m, [itemId]: group }));
  }
  async applyByItems(): Promise<void> {
    const count = this.byItemsGroupCount();
    const assign = this.itemAssign();
    const groups = [];
    for (let g = 1; g <= count; g++) {
      const items = this.activeItems()
        .filter((it) => assign[it.id] === g)
        .map((it) => ({ orderItemId: it.id, quantity: it.quantity }));
      if (items.length) {
        groups.push({ name: `Cliente ${String.fromCharCode(64 + g)}`, items });
      }
    }
    if (!groups.length) {
      this.notify.info('Asigne al menos un plato a un grupo.');
      return;
    }
    this.setOrder(await this.ordersApi.splitByItems(this.orderId, groups));
    this.byItemsMode.set(false);
    this.notify.success('Cuenta dividida por platos.');
  }

  // ---- Pagos ----
  selectGroupForPayment(groupId: string, balance: number): void {
    this.payBillGroupId.set(groupId);
    this.payAmount.set(balance);
  }
  clearGroupSelection(): void {
    this.payBillGroupId.set('');
    this.payAmount.set(this.order()?.balance ?? 0);
  }

  async registerPayment(): Promise<void> {
    if (this.payAmount() <= 0) {
      this.notify.info('Ingrese un monto válido.');
      return;
    }
    const order = await this.ordersApi.pay(this.orderId, {
      method: this.payMethod(),
      amount: this.payAmount(),
      billGroupId: this.payBillGroupId() || undefined,
      reference: this.payReference() || undefined,
    });
    this.payReference.set('');
    this.payBillGroupId.set('');
    this.setOrder(order);
    if (order.status !== OrderStatus.CERRADA) {
      this.notify.success('Pago registrado.');
    }
  }
}
