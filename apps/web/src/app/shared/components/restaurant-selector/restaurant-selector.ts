import { Component, computed, ElementRef, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ActiveRestaurantService } from '../../../core/services/active-restaurant.service';
import { Icon } from '../icon/icon';
import { MyRestaurantDto } from '@restaurante/shared-types';

@Component({
  selector: 'app-restaurant-selector',
  standalone: true,
  imports: [Icon],
  templateUrl: './restaurant-selector.html',
  styleUrl: './restaurant-selector.scss',
})
export class RestaurantSelector {
  private readonly active = inject(ActiveRestaurantService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly restaurants = this.active.restaurants;
  readonly activeId = this.active.activeRestaurantId;
  readonly activeRestaurant = this.active.activeRestaurant;
  readonly hasMultiple = this.active.hasMultiple;
  readonly open = signal(false);

  readonly displayName = computed(() => {
    const r = this.activeRestaurant();
    return r?.name ?? 'Sin local';
  });

  readonly displayInitials = computed(() => {
    const name = this.displayName();
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'L';
  });

  toggle(): void {
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
  }

  select(r: MyRestaurantDto): void {
    this.active.setActive(r.id);
    this.close();
  }

  goToSelect(): void {
    this.close();
    void this.router.navigate(['/seleccionar-local']);
  }

  /** Cierra el menú al hacer clic fuera del componente. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.close();
    }
  }

  /** Cierra con Escape. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.close();
  }
}
