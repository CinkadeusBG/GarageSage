import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient }     from '@angular/common/http';
import { ButtonModule }   from 'primeng/button';
import { TabViewModule }  from 'primeng/tabview';
import { TableModule }    from 'primeng/table';
import { TagModule }      from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { VehicleService, Vehicle } from '../../core/services/vehicle.service';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, TabViewModule, TableModule, TagModule, SkeletonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <a routerLink="/vehicles" class="back-link"><i class="pi pi-arrow-left"></i> Vehicles</a>
        <div class="header-actions" *ngIf="vehicle()">
          <p-button [routerLink]="['/vehicles', vehicle()!.id, 'edit']"
            icon="pi pi-pencil" label="Edit" severity="secondary" size="small" />
        </div>
      </div>

      <!-- Vehicle hero -->
      <div class="vehicle-hero" *ngIf="vehicle()">
        <div class="hero-photo" [style.background]="colorFor(vehicle()!.make)">
          <img *ngIf="vehicle()!.photoUrl" [src]="vehicle()!.photoUrl" [alt]="vehicle()!.make" />
          <span *ngIf="!vehicle()!.photoUrl" class="hero-initial">{{ vehicle()!.make.charAt(0) }}</span>
        </div>
        <div class="hero-info">
          <h1>{{ vehicle()!.year }} {{ vehicle()!.make }} {{ vehicle()!.model }}</h1>
          <div class="hero-meta">
            <span *ngIf="vehicle()!.licensePlate"><i class="pi pi-id-card"></i> {{ vehicle()!.licensePlate }}</span>
            <span><i class="pi pi-gauge"></i> {{ vehicle()!.currentMileage | number }} mi</span>
            <span *ngIf="vehicle()!.vin"><i class="pi pi-barcode"></i> {{ vehicle()!.vin }}</span>
          </div>
        </div>
        <div class="hero-actions">
          <p-button label="Log service" icon="pi pi-wrench" size="small"
            [routerLink]="['/maintenance/new']" [queryParams]="{vehicleId: vehicle()!.id}" />
          <p-button label="Log fuel" icon="pi pi-database" size="small" severity="secondary"
            [routerLink]="['/fuel/new']" [queryParams]="{vehicleId: vehicle()!.id}" />
        </div>
      </div>

      <!-- Tabs -->
      <p-tabView>
        <!-- Maintenance -->
        <p-tabPanel header="Maintenance" leftIcon="pi pi-wrench">
          <p-table [value]="maintenanceLogs()" [loading]="loadingLogs()"
            [paginator]="maintenanceLogs().length > 10" [rows]="10"
            emptyMessage="No maintenance logs yet." styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="date">Date<p-sortIcon field="date" /></th>
                <th>Type</th>
                <th pSortableColumn="mileage">Mileage<p-sortIcon field="mileage" /></th>
                <th>Shop</th>
                <th pSortableColumn="cost">Cost<p-sortIcon field="cost" /></th>
                <th></th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-log>
              <tr>
                <td>{{ log.date | date:'mediumDate' }}</td>
                <td><p-tag [value]="log.type" severity="info" /></td>
                <td>{{ log.mileage | number }} mi</td>
                <td>{{ log.shop ?? '—' }}</td>
                <td>{{ log.cost ? ('$' + (log.cost | number:'1.2-2')) : '—' }}</td>
                <td>
                  <p-button icon="pi pi-pencil" [text]="true" size="small"
                    [routerLink]="['/maintenance', log.id, 'edit']" />
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Fuel -->
        <p-tabPanel header="Fuel" leftIcon="pi pi-database">
          <p-table [value]="fuelLogs()" [loading]="loadingFuel()"
            emptyMessage="No fuel logs yet." styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Date</th>
                <th>Mileage</th>
                <th>Gallons / Liters</th>
                <th>Price/unit</th>
                <th>Total</th>
                <th>Efficiency</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-log>
              <tr>
                <td>{{ log.date | date:'mediumDate' }}</td>
                <td>{{ log.mileage | number }} mi</td>
                <td>{{ log.gallons ? (log.gallons | number:'1.1-1') + ' gal' : '' }}{{ log.liters ? (log.liters | number:'1.1-1') + ' L' : '' }}</td>
                <td>{{ log.pricePerUnit ? ('$' + (log.pricePerUnit | number:'1.3-3')) : '—' }}</td>
                <td>{{ log.totalCost ? ('$' + (log.totalCost | number:'1.2-2')) : '—' }}</td>
                <td>
                  <span *ngIf="log.mpg">{{ log.mpg | number:'1.1-1' }} MPG</span>
                  <span *ngIf="log.l100km"> / {{ log.l100km | number:'1.1-1' }} L/100km</span>
                  <span *ngIf="!log.mpg && !log.l100km">—</span>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Reminders -->
        <p-tabPanel header="Reminders" leftIcon="pi pi-bell">
          <div class="reminders-header">
            <p-button label="Add reminder" icon="pi pi-plus" size="small"
              [routerLink]="['/reminders/new']" [queryParams]="{vehicleId: vehicle()?.id}" />
          </div>
          <p-table [value]="reminders()" emptyMessage="No reminders set." styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Task</th>
                <th>Interval</th>
                <th>Next due</th>
                <th>Priority</th>
                <th></th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-r>
              <tr>
                <td>{{ r.title }}</td>
                <td>
                  <span *ngIf="r.intervalMileage">Every {{ r.intervalMileage | number }} mi</span>
                  <span *ngIf="r.intervalMileage && r.intervalDays"> / </span>
                  <span *ngIf="r.intervalDays">Every {{ r.intervalDays }} days</span>
                </td>
                <td>
                  <span *ngIf="r.nextDueDate">{{ r.nextDueDate | date:'mediumDate' }}</span>
                  <span *ngIf="r.nextDueMileage"> / {{ r.nextDueMileage | number }} mi</span>
                </td>
                <td>
                  <p-tag [value]="r.priority"
                    [severity]="r.priority === 'CRITICAL' ? 'danger' : r.priority === 'HIGH' ? 'warn' : 'secondary'" />
                </td>
                <td>
                  <p-button icon="pi pi-check" [text]="true" size="small"
                    pTooltip="Mark done" [routerLink]="['/reminders', r.id]" />
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>
    </div>
  `,
  styles: [`
    .page { max-width: 1100px; margin: 0 auto; }
    .page-header { display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem; }
    .back-link { color:var(--p-text-muted-color);text-decoration:none;font-size:0.875rem;display:inline-flex;align-items:center;gap:0.4rem; }
    .vehicle-hero {
      display:flex;align-items:center;gap:1.5rem;
      background:white;border-radius:12px;padding:1.25rem;
      margin-bottom:1.5rem;box-shadow:0 1px 3px rgba(0,0,0,.08);
    }
    .hero-photo {
      width:72px;height:72px;border-radius:12px;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;overflow:hidden;
    }
    .hero-photo img { width:100%;height:100%;object-fit:cover; }
    .hero-initial { color:white;font-size:2rem;font-weight:700; }
    .hero-info { flex:1; }
    h1 { margin:0 0 0.4rem;font-size:1.3rem;font-weight:600; }
    .hero-meta { display:flex;gap:1rem;flex-wrap:wrap;font-size:0.8rem;color:var(--p-text-muted-color); }
    .hero-meta span { display:flex;align-items:center;gap:0.3rem; }
    .hero-actions { display:flex;gap:0.5rem;flex-wrap:wrap; }
    .reminders-header { margin-bottom:1rem; }
  `],
})
export class VehicleDetailComponent implements OnInit {
  vehicle         = signal<Vehicle | null>(null);
  maintenanceLogs = signal<any[]>([]);
  fuelLogs        = signal<any[]>([]);
  reminders       = signal<any[]>([]);
  loadingLogs     = signal(true);
  loadingFuel     = signal(true);

  constructor(
    private readonly svc:   VehicleService,
    private readonly http:  HttpClient,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.getOne(id).subscribe(v => this.vehicle.set(v));

    this.http.get<any[]>(`/api/maintenance/vehicle/${id}`).subscribe(logs => {
      this.maintenanceLogs.set(logs); this.loadingLogs.set(false);
    });
    this.http.get<any[]>(`/api/fuel/vehicle/${id}`).subscribe(logs => {
      this.fuelLogs.set(logs); this.loadingFuel.set(false);
    });
    this.http.get<any[]>(`/api/reminders/vehicle/${id}`).subscribe(r => this.reminders.set(r));
  }

  colorFor(make: string): string {
    const c = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444'];
    let h = 0; for (const ch of make) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
    return c[h % c.length];
  }
}
