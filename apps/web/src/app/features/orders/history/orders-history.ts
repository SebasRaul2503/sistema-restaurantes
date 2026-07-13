import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OrderHistoryFilterDto, OrderStatus, PaginatedOrdersDto } from '@restaurante/shared-types';
import { OrdersHistoryApi } from '../../../core/data/orders-history.api';
import { SolesPipe } from '../../../shared/pipes/soles.pipe';
import { DateField } from '../../../shared/components/date-field/date-field';

type StatusFilter = 'cerrados' | 'anulados' | 'todos';

@Component({
  selector: 'app-orders-history',
  standalone: true,
  imports: [FormsModule, RouterLink, SolesPipe, DateField],
  templateUrl: './orders-history.html',
  styleUrl: './orders-history.scss',
})
export class OrdersHistoryPage implements OnInit {
  private readonly api = inject(OrdersHistoryApi);

  readonly OrderStatus = OrderStatus;
  readonly loading = signal(false);
  readonly result = signal<PaginatedOrdersDto | null>(null);

  // Filtros
  readonly from = signal('');
  readonly to = signal('');
  readonly status = signal<StatusFilter>('cerrados');
  readonly q = signal('');

  // Debounce de la búsqueda
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  readonly debouncedQ = signal('');

  // Paginación
  readonly page = signal(1);
  readonly pageSize = 50;

  // Recalcula totalPages
  readonly totalPages = computed(() => {
    const r = this.result();
    if (!r) return 1;
    return Math.max(1, Math.ceil(r.total / r.pageSize));
  });

  constructor() {
    // Cuando el usuario escribe en la búsqueda, espera 300ms antes de buscar.
    effect(() => {
      const term = this.q();
      if (this.searchTimer !== null) clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.debouncedQ.set(term);
        this.page.set(1);
      }, 300);
    });

    // Carga cuando cambian los filtros o la página.
    effect(() => {
      const f: OrderHistoryFilterDto = {
        from: this.from() || undefined,
        to: this.to() || undefined,
        status: this.status(),
        q: this.debouncedQ() || undefined,
        page: this.page(),
        pageSize: this.pageSize,
      };
      void this.fetch(f);
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    // El effect del constructor ya dispara el primer fetch.
  }

  private async fetch(filter: OrderHistoryFilterDto): Promise<void> {
    this.loading.set(true);
    try {
      this.result.set(await this.api.list(filter));
    } catch {
      this.result.set({ items: [], total: 0, page: 1, pageSize: this.pageSize });
    } finally {
      this.loading.set(false);
    }
  }

  onFromChange(v: string): void { this.from.set(v); this.page.set(1); }
  onToChange(v: string): void { this.to.set(v); this.page.set(1); }
  onStatusChange(v: StatusFilter): void { this.status.set(v); this.page.set(1); }
  onSearchInput(v: string): void { this.q.set(v); }

  clearFilters(): void {
    this.from.set('');
    this.to.set('');
    this.status.set('cerrados');
    this.q.set('');
    this.page.set(1);
  }

  prevPage(): void { if (this.page() > 1) this.page.update((p) => p - 1); }
  nextPage(): void { if (this.page() < this.totalPages()) this.page.update((p) => p + 1); }

  formatDate(iso: string): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }
}
