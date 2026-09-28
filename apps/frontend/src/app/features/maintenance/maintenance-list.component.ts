import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { RouterLink }     from '@angular/router';
import { HttpClient }     from '@angular/common/http';
import { FormsModule }    from '@angular/forms';
import { ButtonModule }   from 'primeng/button';
import { TableModule }    from 'primeng/table';
import { TagModule }      from 'primeng/tag';
import { DropdownModule } from 'primeng/dropdown';
import { VehicleService } from '../../core/services/vehicle.service';
import { MakeLogoComponent } from '../../core/make-logo.component';

@Component({
  selector: 'app-maintenance-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ButtonModule, TableModule, TagModule, DropdownModule, MakeLogoComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Maintenance Logs</h1>
        <p-button label="Log service" icon="pi pi-plus" routerLink="/maintenance/new" />
      </div>

      <div class="filters">
        <p-dropdown
          [options]="vehicleOptions()" [(ngModel)]="selectedVehicleId"
          optionLabel="label" optionValue="value"
          placeholder="All vehicles" [showClear]="true"
          (onChange)="onVehicleChange()" styleClass="w-full" />
      </div>

      <p-table [value]="logs()" [loading]="loading()"
        [paginator]="true" [rows]="15" [showCurrentPageReport]="true"
        currentPageReportTemplate="{first} – {last} of {totalRecords}"
        [globalFilterFields]="['type','shop','description']"
        sortField="date" [sortOrder]="-1"
        emptyMessage="No maintenance logs found." styleClass="p-datatable-sm mt-3">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="date">Date <p-sortIcon field="date" /></th>
            <th>Vehicle</th>
            <th pSortableColumn="type">Type <p-sortIcon field="type" /></th>
            <th pSortableColumn="mileage">Mileage <p-sortIcon field="mileage" /></th>
            <th>Shop</th>
            <th pSortableColumn="cost">Cost <p-sortIcon field="cost" /></th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-log>
          <tr>
            <td>{{ log.date | date:'mediumDate' }}</td>
            <td *ngIf="!selectedVehicleId">
              <span class="veh-cell">
                <app-make-logo [make]="log.vehicle?.make" size="sm" />
                <span>{{ log.vehicle?.year }} {{ log.vehicle?.make }} {{ log.vehicle?.model }}<ng-container *ngIf="log.vehicle?.trim"> {{ log.vehicle.trim }}</ng-container></span>
              </span>
            </td>
            <td><p-tag [value]="log.type" severity="info" /></td>
            <td>{{ log.mileage | number }} mi</td>
            <td>{{ log.shop || '—' }}</td>
            <td>{{ log.cost != null ? ('$' + (log.cost | number:'1.2-2')) : '—' }}</td>
            <td>
              <p-button icon="pi pi-pencil" [text]="true" size="small"
                [routerLink]="['/maintenance', log.id, 'edit']" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="summary">
          Total cost: <strong>\${{ totalCost() | number:'1.2-2' }}</strong>
        </ng-template>
      </p-table>
    </div>
  `,
  styles: [`
    .page { max-width: 1100px; margin: 0 auto; }
    .page-header { display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem; }
    h1 { margin:0;font-size:1.5rem;font-weight:600; }
    .filters { max-width: 280px; }
    .veh-cell { display:flex; align-items:center; gap:0.5rem; }
  `],
})
export class MaintenanceListComponent implements OnInit {
  logs               = signal<any[]>([]);
  loading            = signal(true);
  selectedVehicleId  = signal<string | null>(null);

  vehicleOptions = () => [
    { label: 'All vehicles', value: null },
    ...this.vehicleSvc.byYear().map(v => ({
      label: this.vehicleSvc.displayName(v),
      value: v.id,
    })),
  ];

  totalCost = () => this.logs().reduce((sum, l) => sum + (l.cost ?? 0), 0);

  constructor(private readonly http: HttpClient, private readonly vehicleSvc: VehicleService) {}

  ngOnInit() { this.loadAll(); }

  onVehicleChange() {
    const id = this.selectedVehicleId();
    if (id) {
      this.loading.set(true);
      this.http.get<any[]>(`/api/maintenance/vehicle/${id}`).subscribe(d => {
        this.logs.set(d); this.loading.set(false);
      });
    } else {
      this.loadAll();
    }
  }

  private loadAll() {
    this.loading.set(true);
    // Load logs for all vehicles in parallel then merge
    const vehicles = this.vehicleSvc.vehicles();
    if (!vehicles.length) { this.logs.set([]); this.loading.set(false); return; }

    let remaining = vehicles.length;
    const all: any[] = [];
    for (const v of vehicles) {
      this.http.get<any[]>(`/api/maintenance/vehicle/${v.id}`).subscribe(logs => {
        all.push(...logs.map(l => ({ ...l, vehicle: v })));
        if (--remaining === 0) {
          this.logs.set(all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          this.loading.set(false);
        }
      });
    }
  }
}
