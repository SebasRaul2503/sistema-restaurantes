import { Component, HostListener, inject } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [Icon],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  readonly confirmService = inject(ConfirmService);
  readonly state = this.confirmService.state;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.state().open) this.confirmService.cancel();
  }

  variantClass(): string {
    const v = this.state().variant;
    if (v === 'danger') return 'btn-danger';
    if (v === 'warning') return 'btn-warning';
    return 'btn-primary';
  }

  iconName(): string {
    const v = this.state().variant;
    if (v === 'danger') return 'trash';
    if (v === 'warning') return 'edit';
    return 'check';
  }
}
