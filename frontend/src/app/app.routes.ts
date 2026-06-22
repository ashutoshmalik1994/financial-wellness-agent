import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'payslips',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/payslip/payslip.component').then((m) => m.PayslipComponent),
  },
  {
    path: 'chat',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/chat/chat.component').then((m) => m.ChatComponent),
  },
  {
    path: 'tax-planner',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/tax-planner/tax-planner.component').then((m) => m.TaxPlannerComponent),
  },
  { path: '**', redirectTo: '/dashboard' },
];
