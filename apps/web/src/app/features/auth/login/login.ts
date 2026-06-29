import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  readonly email = signal('');
  readonly password = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly settings = this.theme.settings;

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      void this.router.navigate(['/panel']);
    }
    void this.theme.loadTenant();
  }

  async submit(): Promise<void> {
    if (!this.email() || !this.password()) {
      this.error.set('Ingrese su correo y contraseña.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.auth.login(this.email(), this.password());
      await this.router.navigate(['/panel']);
    } catch {
      this.error.set('Credenciales incorrectas. Verifique e intente nuevamente.');
    } finally {
      this.loading.set(false);
    }
  }
}
