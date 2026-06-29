import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainer } from './shared/components/toast-container/toast-container';
import { ActiveRestaurantService } from './core/services/active-restaurant.service';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly activeRestaurant = inject(ActiveRestaurantService);

  async ngOnInit(): Promise<void> {
    if (this.auth.isAuthenticated()) {
      await this.auth.refreshMe();
      await this.activeRestaurant.load();
    } else {
      void this.theme.loadTenant();
    }
  }
}
