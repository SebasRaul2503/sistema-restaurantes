import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
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
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    // Intenta rehidratar la sesión desde la cookie httpOnly. Si la cookie
    // sigue viva, el usuario entra sin escribir credenciales; si no, queda
    // en /ingresar.
    const ok = await this.auth.bootstrap();
    if (ok) {
      await this.activeRestaurant.load();
    } else {
      void this.theme.loadTenant();
    }
  }
}
