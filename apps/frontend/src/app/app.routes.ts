import { Routes } from '@angular/router';
import { authGuard }     from './core/guards/auth.guard';
import { guestGuard }    from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '',            redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'vehicles',
        loadChildren: () => import('./features/vehicles/vehicles.routes').then(m => m.VEHICLES_ROUTES),
      },
      {
        path: 'maintenance',
        loadChildren: () => import('./features/maintenance/maintenance.routes').then(m => m.MAINTENANCE_ROUTES),
      },
      {
        path: 'fuel',
        loadChildren: () => import('./features/fuel/fuel.routes').then(m => m.FUEL_ROUTES),
      },
      {
        path: 'reminders',
        loadChildren: () => import('./features/reminders/reminders.routes').then(m => m.REMINDERS_ROUTES),
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
      },
      {
        path: 'ai',
        loadComponent: () => import('./features/ai-chat/ai-chat.component').then(m => m.AiChatComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
