import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'ingresar',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginPage),
  },
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout').then((m) => m.MainLayout),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'panel', pathMatch: 'full' },
      {
        path: 'panel',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.DashboardPage),
      },
      {
        path: 'mesas',
        loadComponent: () => import('./features/tables/tables').then((m) => m.TablesPage),
      },
      {
        path: 'cocina',
        loadComponent: () => import('./features/kitchen/kitchen').then((m) => m.KitchenPage),
      },
      {
        path: 'pedidos/:orderId',
        loadComponent: () => import('./features/orders/order-detail/order-detail').then((m) => m.OrderDetailPage),
      },
      {
        path: 'caja',
        loadComponent: () => import('./features/cash/cash').then((m) => m.CashPage),
      },
      {
        path: 'carta',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/menu/menu').then((m) => m.MenuPage),
      },
      {
        path: 'reportes',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/reports/reports').then((m) => m.ReportsPage),
      },
      {
        path: 'configuracion',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/settings/settings').then((m) => m.SettingsPage),
      },
      {
        path: 'usuarios',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/users/users').then((m) => m.UsersPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
