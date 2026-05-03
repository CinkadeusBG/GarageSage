import { Routes } from '@angular/router';

export const REMINDERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./reminders-list.component').then(m => m.RemindersListComponent),
  },
  {
    path: 'new',
    loadComponent: () => import('./reminder-form.component').then(m => m.ReminderFormComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./reminder-form.component').then(m => m.ReminderFormComponent),
  },
];
