import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ActiveRestaurantService } from '../../../core/services/active-restaurant.service';
import { Icon } from '../../../shared/components/icon/icon';
import { MyRestaurantDto } from '@restaurante/shared-types';

@Component({
  selector: 'app-select-restaurant',
  standalone: true,
  imports: [Icon],
  templateUrl: './select-restaurant.html',
  styleUrl: './select-restaurant.scss',
})
export class SelectRestaurantPage {
  private readonly active = inject(ActiveRestaurantService);
  private readonly router = inject(Router);

  readonly restaurants = this.active.restaurants;
  readonly activeId = this.active.activeRestaurantId;

  initials(name: string | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  async pick(r: MyRestaurantDto): Promise<void> {
    this.active.setActive(r.id);
    await this.router.navigate(['/panel']);
  }
}
