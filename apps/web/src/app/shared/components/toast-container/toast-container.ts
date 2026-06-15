import { Component, inject } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.scss',
})
export class ToastContainer {
  private readonly notify = inject(NotificationService);
  readonly toasts = this.notify.toasts;

  dismiss(id: number): void {
    this.notify.dismiss(id);
  }
}
