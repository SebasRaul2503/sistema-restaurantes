import { Component } from '@angular/core';

@Component({
  selector: 'app-restaurants-list',
  standalone: true,
  template: `
    <div class="page-head">
      <h1>Locales</h1>
    </div>
    <div class="card card-pad empty-state">
      <p>Próximamente: gestión completa de locales y miembros.</p>
    </div>
  `,
})
export class RestaurantsListPage {}
