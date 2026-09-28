import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }     from '@angular/common';
import { RouterLink }       from '@angular/router';
import { HttpClient }       from '@angular/common/http';
import { ButtonModule }     from 'primeng/button';
import { TagModule }        from 'primeng/tag';
import { SkeletonModule }   from 'primeng/skeleton';
import { VehicleService }   from '../../core/services/vehicle.service';
import { MakeLogoComponent } from '../../core/make-logo.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, TagModule, SkeletonModule, MakeLogoComponent],
  template: `
    <div class="dash">
      <header class="dash-head">
        <div>
          <span class="kicker">Overview</span>
          <h1>Garage</h1>
        </div>
        <p-button label="Add Vehicle" icon="pi pi-plus" routerLink="/vehicles/new" />
      </header>

      <section class="stat-grid">
        <div class="stat stat--amber">
          <span class="stat-kicker">Vehicles</span>
          <span class="stat-num">{{ vehicles.vehicles().length }}</span>
        </div>
        <div class="stat stat--good">
          <span class="stat-kicker">Maintenance YTD</span>
          <span class="stat-num">\${{ (summary()?.ytdMaintenanceCost ?? 0) | number:'1.0-0' }}</span>
        </div>
        <div class="stat stat--hot">
          <span class="stat-kicker">Due soon</span>
          <span class="stat-num">{{ summary()?.upcomingReminders ?? 0 }}</span>
        </div>
        <div class="stat stat--steel">
          <span class="stat-kicker">Services YTD</span>
          <span class="stat-num">{{ summary()?.ytdMaintenanceJobs ?? 0 }}</span>
        </div>
      </section>

      <section class="panels">
        <div class="panel">
          <div class="panel-head">
            <span class="kicker">Fleet</span>
            <h2>Your vehicles</h2>
          </div>
          <div *ngIf="!vehicles.vehicles().length" class="empty-state">
            <p>No vehicles yet.</p>
            <p-button label="Add your first vehicle" icon="pi pi-plus" routerLink="/vehicles/new" size="small" />
          </div>
          <div class="vehicle-list">
            <a *ngFor="let v of vehicles.ordered()" [routerLink]="['/vehicles', v.id]" class="vehicle-row" [class.parked]="v.outOfService">
              <app-make-logo [make]="v.make" />
              <div class="vehicle-info">
                <div class="vehicle-name">{{ v.year }} {{ v.make }} {{ v.model }}<span *ngIf="v.trim"> {{ v.trim }}</span></div>
                <div class="vehicle-meta">
                  {{ v.currentMileage | number }} mi
                  <span *ngIf="v.outOfService"> · Out of service</span>
                </div>
              </div>
              <i class="pi pi-angle-right"></i>
            </a>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <span class="kicker">Recent</span>
            <h2>Service</h2>
          </div>
          <ng-container *ngIf="loadingActivity(); else activityList">
            <p-skeleton *ngFor="let i of [1,2,3]" height="3.2rem" styleClass="mb-2" />
          </ng-container>
          <ng-template #activityList>
            <div *ngIf="!recentActivity().length" class="empty-state">
              <p>No maintenance logged yet.</p>
              <p-button label="Log service" routerLink="/maintenance/new" size="small" />
            </div>
            <div *ngFor="let log of recentActivity()" class="activity-row">
              <app-make-logo [make]="log.vehicle.make" size="sm" />
              <div class="activity-info">
                <div class="activity-vehicle">{{ log.vehicle.year }} {{ log.vehicle.make }} {{ log.vehicle.model }}<span *ngIf="log.vehicle.trim"> {{ log.vehicle.trim }}</span></div>
                <div class="activity-meta">{{ log.date | date:'mediumDate' }} · {{ log.mileage | number }} mi</div>
              </div>
              <p-tag [value]="log.type" severity="secondary" />
              <div *ngIf="log.cost" class="activity-cost">\${{ log.cost | number:'1.2-2' }}</div>
            </div>
          </ng-template>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .dash { max-width: 1180px; margin: 0 auto; }
    .kicker {
      display: block; font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase;
      color: var(--accent); margin-bottom: 0.35rem;
    }
    .dash-head {
      display: flex; align-items: flex-end; justify-content: space-between;
      margin-bottom: 1.6rem; gap: 1rem;
    }
    .dash-head h1 {
      margin: 0; font-size: 3.1rem; font-weight: 800; letter-spacing: -0.045em; line-height: 0.9;
      background: linear-gradient(180deg, var(--fg) 20%, var(--fg-3));
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .stat-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.9rem; margin-bottom: 1.4rem;
    }
    .stat {
      position: relative; overflow: hidden;
      padding: 1.05rem 1.15rem 1rem 1.25rem; border-radius: 16px;
      background:
        radial-gradient(circle at 90% 0%, oklch(0.82 0.14 75 / 0.16), transparent 46%),
        linear-gradient(165deg, var(--surface-2), var(--surface));
      border: 1px solid var(--border);
      box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.05);
    }
    .stat::before {
      content: ''; position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 2px;
    }
    .stat--amber::before { background: var(--accent); box-shadow: 0 0 12px var(--accent-glow); }
    .stat--good::before { background: var(--good); box-shadow: 0 0 12px oklch(0.78 0.14 150 / 0.55); }
    .stat--hot::before { background: var(--danger); box-shadow: 0 0 12px oklch(0.70 0.18 25 / 0.5); }
    .stat--steel::before { background: var(--fg-2); }
    .stat-kicker {
      display: block; font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 0.68rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--fg-3);
    }
    .stat-num {
      display: block; margin-top: 0.35rem;
      font-size: 2.35rem; font-weight: 800; letter-spacing: -0.04em; line-height: 1;
    }
    .panels { display: grid; grid-template-columns: 1.1fr 1fr; gap: 1rem; }
    .panel {
      position: relative; overflow: hidden;
      padding: 1.15rem 1.15rem 0.6rem; border-radius: 18px;
      background: linear-gradient(180deg, var(--surface) 0%, var(--bg-2) 100%);
      border: 1px solid var(--border);
    }
    .panel-head { margin-bottom: 0.75rem; }
    .panel-head h2 { margin: 0; font-size: 1.55rem; font-weight: 800; letter-spacing: -0.03em; }
    .vehicle-list { display: flex; flex-direction: column; }
    .vehicle-row {
      display: flex; align-items: center; gap: 0.85rem;
      padding: 0.7rem 0.35rem; border-top: 1px solid var(--border);
      text-decoration: none; color: inherit;
      transition: background 0.15s, padding 0.15s;
    }
    .vehicle-row:hover { background: oklch(0.82 0.14 75 / 0.06); padding-left: 0.55rem; }
    .vehicle-name { font-weight: 700; letter-spacing: -0.01em; }
    .vehicle-meta { font-size: 0.82rem; color: var(--fg-3); margin-top: 0.1rem; }
    .vehicle-info { flex: 1; }
    .vehicle-row .pi { color: var(--fg-3); }
    .vehicle-row.parked { opacity: 0.42; }
    .activity-row {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.7rem 0; border-top: 1px solid var(--border);
    }
    .activity-info { flex: 1; min-width: 0; }
    .activity-vehicle { font-weight: 700; }
    .activity-meta { font-size: 0.82rem; color: var(--fg-3); margin-top: 0.1rem; }
    .activity-cost { font-weight: 800; color: var(--good); letter-spacing: -0.02em; }
    .empty-state { text-align: center; padding: 1.5rem 0.5rem 1.2rem; color: var(--fg-3); }
    @media (max-width: 900px) {
      .stat-grid, .panels { grid-template-columns: 1fr 1fr; }
      .dash-head h1 { font-size: 2.4rem; }
    }
    @media (max-width: 640px) {
      .stat-grid, .panels { grid-template-columns: 1fr; }
    }
  `],
})
export class DashboardComponent implements OnInit {
  summary           = signal<any>(null);
  recentActivity    = signal<any[]>([]);
  loadingActivity   = signal(true);

  constructor(
    readonly vehicles: VehicleService,
    private readonly http: HttpClient,
  ) {}

  ngOnInit() {
    this.http.get<any>('/api/reports/dashboard').subscribe(data => {
      this.summary.set(data);
      this.recentActivity.set(data.recentActivity ?? []);
      this.loadingActivity.set(false);
    });
  }
}
