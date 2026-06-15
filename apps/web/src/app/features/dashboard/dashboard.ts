import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardDto } from '@restaurante/shared-types';
import { ReportsApi } from '../../core/data/reports.api';
import { SolesPipe } from '../../shared/pipes/soles.pipe';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, SolesPipe, Icon],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardPage implements OnInit {
  private readonly reports = inject(ReportsApi);

  readonly data = signal<DashboardDto | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      this.data.set(await this.reports.dashboard());
    } finally {
      this.loading.set(false);
    }
  }
}
