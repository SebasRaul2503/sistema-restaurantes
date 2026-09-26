import { Component, inject } from '@angular/core';
import { NotificationService } from '../../core/services/notification.service';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [Icon],
  templateUrl: './support.html',
  styleUrl: './support.scss',
})
export class SupportPage {
  private readonly notify = inject(NotificationService);

  // Datos de contacto genéricos de soporte (reemplazar por los oficiales al publicar).
  readonly phoneDisplay = '+51 999 999 999';
  readonly email = 'soporte@sistema-restaurantes.pe';

  /** Enlace de WhatsApp (formato internacional sin símbolos) con mensaje previo. */
  readonly whatsappUrl =
    'https://wa.me/51999999999?text=' +
    encodeURIComponent('Hola, necesito ayuda con el Sistema de Gestión de Restaurantes.');

  readonly mailtoUrl =
    'mailto:soporte@sistema-restaurantes.pe' +
    '?subject=' +
    encodeURIComponent('Soporte — Sistema de Gestión de Restaurantes');

  async copy(text: string, label: string): Promise<void> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Respaldo para navegadores sin Clipboard API.
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      this.notify.success(`${label} copiado al portapapeles.`);
    } catch {
      this.notify.error('No se pudo copiar. Cópielo manualmente.');
    }
  }
}
