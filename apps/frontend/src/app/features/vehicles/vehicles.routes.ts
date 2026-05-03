import { Routes } from '@angular/router';

export const VEHICLES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./vehicles-list.component').then(m => m.VehiclesListComponent),
  },
  {
    path: 'new',
    loadComponent: () => import('./vehicle-form.component').then(m => m.VehicleFormComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./vehicle-detail.component').then(m => m.VehicleDetailComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./vehicle-form.component').then(m => m.VehicleFormComponent),
  },
];
