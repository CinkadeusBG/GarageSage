import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { RouterLink }     from '@angular/router';
import { HttpClient }     from '@angular/common/http';
import { ButtonModule }   from 'primeng/button';
import { TableModule }    from 'primeng/table';
import { TagModule }      from 'primeng/tag';
import { VehicleService } from '../../core/services/vehicle.service';

@Component({
  selector: 'app-fuel-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, TableModule, TagModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Fuel Logs</h1>
        <p-button label="Add fill-up" icon="pi pi-plus" routerLink="/fuel/new" />
      </div>

      <!-- Stats bar -->
      <div class="stats-bar" *ngIf="stats()">
        <div class="stat">
          <div class="stat-val">{{ stats().avgMpg | number:'1.1-1' }}</div>
          <div class="stat-lbl">Avg MPG</div>
        </div>
        <div class="stat" *ngIf="stats().avgL100km">
          <div class="stat-val">{{ stats().avgL100km | number:'1.1-1' }}</div>
          <div class="stat-lbl">Avg L/100km</div>
        </div>
        <div class="stat">
          <div class="stat-val">\${{ stats().totalCost | number:'1.0-0' }}</div>
          <div class="stat-lbl">Total fuel cost</div>
        </div>
        <div class="stat">
          <div class="stat-val">{{ stats().entries }}</div>
          <div class="stat-lbl">Fill-ups tracked</div>
        </div>
      </div>

      <p-table [value]="logs()" [loading]="loading()"
        [paginator]="true" [rows]="20"
        sortField="date" [sortOrder]="-1"
        emptyMessage="No fuel logs yet." styleClass="p-datatable-sm mt-3">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="date">Date</th>
            <th>Vehicle</th>
            <th pSortableColumn="mileage">Mileage</th>
            <th>Volume</th>
            <th>Price/unit</th>
            <th>Total</th>
            <th>Efficiency</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-log>
          <tr>
            <td>{{ log.date | date:'mediumDate' }}</td>
            <td>{{ log.vehicle?.year }} {{ log.vehicle?.make }} {{ log.vehicle?.model }}</td>
            <td>{{ log.mileage | number }} mi</td>
            <td>{{ log.gallons ? (log.gallons | number:'1.3-3') + ' gal' : '' }}
                {{ log.liters  ? (log.liters  | number:'1.2-2') + ' L'  : '' }}</td>
            <td>{{ log.pricePerUnit ? ('$' + (log.pricePerUnit | number:'1.3-3')) : '—' }}</td>
            <td>{{ log.totalCost ? ('$' + (log.totalCost | number:'1.2-2')) : '—' }}</td>
            <td>
              <span *ngIf="log.mpg">{{ log.mpg | number:'1.1-1' }} MPG</span>
              <span *ngIf="!log.mpg">—</span>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
  styles: [`
    .page{max-width:1100px;margin:0 auto;}
    .page-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;}
    h1{margin:0;font-size:1.5rem;font-weight:600;}
    .stats-bar{display:flex;gap:1.5rem;background:white;border-radius:10px;padding:1rem 1.5rem;
      box-shadow:0 1px 3px rgba(0,0,0,.08);flex-wrap:wrap;}
    .stat{text-align:center;}
    .stat-val{font-size:1.4rem;font-weight:700;}
    .stat-lbl{font-size:0.72rem;color:var(--p-text-muted-color);margin-top:2px;}
  `],
})
export class FuelListComponent implements OnInit {
  logs    = signal<any[]>([]);
  stats   = signal<any>(null);
  loading = signal(true);

  constructor(private readonly http: HttpClient, private readonly vehicleSvc: VehicleService) {}

  ngOnInit() {
    const vehicles = this.vehicleSvc.vehicles();
    if (!vehicles.length) { this.loading.set(false); return; }

    let rem = vehicles.length;
    const all: any[] = [];
    for (const v of vehicles) {
      this.http.get<any[]>(`/api/fuel/vehicle/${v.id}`).subscribe(logs => {
        all.push(...logs.map(l => ({ ...l, vehicle: v })));
        if (--rem === 0) {
          const sorted = all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          this.logs.set(sorted);
          this.loading.set(false);
          // Aggregate stats
          const mpgs = sorted.filter(l => l.mpg).map(l => l.mpg);
          const l100s = sorted.filter(l => l.l100km).map(l => l.l100km);
          this.stats.set({
            avgMpg:    mpgs.length  ? mpgs.reduce((a, b) => a + b, 0) / mpgs.length  : null,
            avgL100km: l100s.length ? l100s.reduce((a, b) => a + b, 0) / l100s.length : null,
            totalCost: sorted.reduce((a, l) => a + (l.totalCost ?? 0), 0),
            entries:   sorted.length,
          });
        }
      });
    }
  }
}
