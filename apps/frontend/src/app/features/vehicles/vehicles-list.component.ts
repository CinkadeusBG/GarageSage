import { Component } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { RouterLink }    from '@angular/router';
import { ButtonModule }  from 'primeng/button';
import { CardModule }    from 'primeng/card';
import { TagModule }     from 'primeng/tag';
import { VehicleService } from '../../core/services/vehicle.service';

@Component({
  selector: 'app-vehicles-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, CardModule, TagModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Vehicles</h1>
        <p-button label="Add Vehicle" icon="pi pi-plus" routerLink="/vehicles/new" />
      </div>

      <div *ngIf="!svc.vehicles().length" class="empty-state">
        <i class="pi pi-car" style="font-size:3rem;opacity:.3"></i>
        <h3>No vehicles yet</h3>
        <p>Add your first vehicle to start tracking maintenance.</p>
        <p-button label="Add Vehicle" icon="pi pi-plus" routerLink="/vehicles/new" />
      </div>

      <div class="vehicles-grid">
        <a *ngFor="let v of svc.vehicles()" [routerLink]="['/vehicles', v.id]" class="vehicle-card">
          <div class="vehicle-photo" [style.background]="colorFor(v.make)">
            <img *ngIf="v.photoUrl" [src]="v.photoUrl" [alt]="v.make" />
            <span *ngIf="!v.photoUrl" class="vehicle-initial">{{ v.make.charAt(0) }}</span>
          </div>
          <div class="vehicle-body">
            <div class="vehicle-title">{{ v.year }} {{ v.make }} {{ v.model }}</div>
            <div class="vehicle-sub">
              <span *ngIf="v.licensePlate">{{ v.licensePlate }} ·</span>
              {{ v.currentMileage | number }} mi
            </div>
            <div class="vehicle-counts" *ngIf="v._count">
              <p-tag [value]="v._count.maintenanceLogs + ' services'" severity="info" />
              <p-tag [value]="v._count.reminders + ' reminders'"
                [severity]="v._count.reminders > 0 ? 'warn' : 'secondary'" />
            </div>
          </div>
          <i class="pi pi-angle-right vehicle-arrow"></i>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 900px; margin: 0 auto; }
    .page-header { display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem; }
    h1 { margin: 0; font-size: 1.5rem; font-weight: 600; }
    .empty-state { text-align:center;padding:4rem 2rem;color:var(--p-text-muted-color); }
    .vehicles-grid { display:flex;flex-direction:column;gap:0.75rem; }
    .vehicle-card {
      display:flex;align-items:center;gap:1rem;
      background:white;border-radius:12px;padding:1rem;
      text-decoration:none;color:inherit;
      box-shadow:0 1px 3px rgba(0,0,0,.08);transition:box-shadow .15s;
    }
    .vehicle-card:hover { box-shadow:0 4px 12px rgba(0,0,0,.12); }
    .vehicle-photo {
      width:56px;height:56px;border-radius:10px;overflow:hidden;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;
    }
    .vehicle-photo img { width:100%;height:100%;object-fit:cover; }
    .vehicle-initial { color:white;font-size:1.5rem;font-weight:700; }
    .vehicle-body { flex:1; }
    .vehicle-title { font-weight:600;font-size:0.95rem; }
    .vehicle-sub { font-size:0.8rem;color:var(--p-text-muted-color);margin:2px 0; }
    .vehicle-counts { display:flex;gap:0.4rem;margin-top:0.4rem;flex-wrap:wrap; }
    .vehicle-arrow { color:var(--p-text-muted-color); }
  `],
})
export class VehiclesListComponent {
  constructor(readonly svc: VehicleService) {}

  colorFor(make: string): string {
    const colors = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444'];
    let h = 0; for (const c of make) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return colors[h % colors.length];
  }
}
