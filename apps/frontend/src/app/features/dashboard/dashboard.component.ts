import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }     from '@angular/common';
import { RouterLink }       from '@angular/router';
import { HttpClient }       from '@angular/common/http';
import { CardModule }       from 'primeng/card';
import { ButtonModule }     from 'primeng/button';
import { TagModule }        from 'primeng/tag';
import { SkeletonModule }   from 'primeng/skeleton';
import { ChipModule }       from 'primeng/chip';
import { VehicleService }   from '../../core/services/vehicle.service';
import { AuthService }      from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, CardModule, ButtonModule, TagModule, SkeletonModule, ChipModule],
  template: `
    <div class="dashboard">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Dashboard</h1>
          <p class="text-muted">Welcome back, {{ auth.user()?.name ?? auth.user()?.email }}</p>
        </div>
        <p-button label="Add Vehicle" icon="pi pi-plus" routerLink="/vehicles/new" />
      </div>

      <!-- Summary cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon bg-blue"><i class="pi pi-car"></i></div>
          <div class="stat-body">
            <div class="stat-value">{{ vehicles.vehicles().length }}</div>
            <div class="stat-label">Vehicles</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon bg-green"><i class="pi pi-dollar"></i></div>
          <div class="stat-body">
            <div class="stat-value">\${{ (summary()?.ytdMaintenanceCost ?? 0) | number:'1.0-0' }}</div>
            <div class="stat-label">Maintenance YTD</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon bg-amber"><i class="pi pi-bell"></i></div>
          <div class="stat-body">
            <div class="stat-value">{{ summary()?.upcomingReminders ?? 0 }}</div>
            <div class="stat-label">Due soon</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon bg-purple"><i class="pi pi-wrench"></i></div>
          <div class="stat-body">
            <div class="stat-value">{{ summary()?.ytdMaintenanceJobs ?? 0 }}</div>
            <div class="stat-label">Services YTD</div>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <!-- Vehicles quick-access -->
        <p-card header="Your Vehicles" styleClass="dashboard-card">
          <div *ngIf="!vehicles.vehicles().length" class="empty-state">
            <i class="pi pi-car pi-4x"></i>
            <p>No vehicles yet.</p>
            <p-button label="Add your first vehicle" icon="pi pi-plus" routerLink="/vehicles/new" size="small" />
          </div>
          <div class="vehicle-list">
            <a *ngFor="let v of vehicles.vehicles()" [routerLink]="['/vehicles', v.id]" class="vehicle-row">
              <div class="vehicle-avatar" [style.background]="colorFor(v.make)">
                {{ v.make.charAt(0) }}
              </div>
              <div class="vehicle-info">
                <div class="vehicle-name">{{ v.year }} {{ v.make }} {{ v.model }}</div>
                <div class="vehicle-meta">{{ v.currentMileage | number }} mi</div>
              </div>
              <i class="pi pi-angle-right text-muted"></i>
            </a>
          </div>
        </p-card>

        <!-- Recent activity -->
        <p-card header="Recent Service" styleClass="dashboard-card">
          <ng-container *ngIf="loadingActivity(); else activityList">
            <p-skeleton *ngFor="let i of [1,2,3]" height="3rem" styleClass="mb-2" />
          </ng-container>
          <ng-template #activityList>
            <div *ngIf="!recentActivity().length" class="empty-state">
              <p>No maintenance logged yet.</p>
              <p-button label="Log service" routerLink="/maintenance/new" size="small" />
            </div>
            <div *ngFor="let log of recentActivity()" class="activity-row">
              <p-tag [value]="log.type" severity="info" styleClass="activity-type" />
              <div class="activity-info">
                <div class="activity-vehicle">{{ log.vehicle.year }} {{ log.vehicle.make }} {{ log.vehicle.model }}</div>
                <div class="activity-meta">{{ log.date | date:'mediumDate' }} · {{ log.mileage | number }} mi</div>
              </div>
              <div *ngIf="log.cost" class="activity-cost">\${{ log.cost | number:'1.2-2' }}</div>
            </div>
          </ng-template>
        </p-card>

        <!-- AI suggestions -->
        <p-card header="AI Suggestions" styleClass="dashboard-card ai-card">
          <ng-container *ngIf="loadingSuggestions(); else suggestionList">
            <p-skeleton *ngFor="let i of [1,2,3]" height="2.5rem" styleClass="mb-2" />
          </ng-container>
          <ng-template #suggestionList>
            <div *ngIf="!suggestions().length" class="empty-state">
              <i class="pi pi-sparkles"></i>
              <p>Add vehicles and maintenance logs to get AI suggestions.</p>
            </div>
            <div *ngFor="let s of suggestions(); let i = index" class="suggestion-item">
              <span class="suggestion-num">{{ i + 1 }}</span>
              <span>{{ s }}</span>
            </div>
          </ng-template>
          <div class="mt-3">
            <p-button label="Ask AI assistant" icon="pi pi-sparkles" routerLink="/ai"
              severity="secondary" size="small" styleClass="w-full" />
          </div>
        </p-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard { max-width: 1200px; margin: 0 auto; }
    .page-header {
      display: flex; align-items: flex-start;
      justify-content: space-between; margin-bottom: 1.5rem;
    }
    .page-header h1 { margin: 0; font-size: 1.5rem; font-weight: 600; }
    .text-muted { margin: 0.25rem 0 0; color: var(--p-text-muted-color); font-size: 0.875rem; }
    .stats-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1rem; margin-bottom: 1.5rem;
    }
    .stat-card {
      background: white; border-radius: 12px;
      padding: 1rem; display: flex; align-items: center; gap: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
    }
    .stat-icon {
      width: 44px; height: 44px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.25rem; color: white; flex-shrink: 0;
    }
    .bg-blue { background: #3b82f6; } .bg-green { background: #22c55e; }
    .bg-amber { background: #f59e0b; } .bg-purple { background: #8b5cf6; }
    .stat-value { font-size: 1.4rem; font-weight: 700; }
    .stat-label { font-size: 0.75rem; color: var(--p-text-muted-color); margin-top: 2px; }
    .dashboard-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem;
    }
    .vehicle-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .vehicle-row {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.5rem; border-radius: 8px; text-decoration: none;
      color: inherit; transition: background 0.15s;
    }
    .vehicle-row:hover { background: var(--p-surface-100); }
    .vehicle-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 600; font-size: 0.875rem; flex-shrink: 0;
    }
    .vehicle-name { font-size: 0.875rem; font-weight: 500; }
    .vehicle-meta { font-size: 0.75rem; color: var(--p-text-muted-color); }
    .vehicle-info { flex: 1; }
    .activity-row { display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;border-bottom:1px solid var(--p-surface-200); }
    .activity-row:last-child { border: none; }
    .activity-type { flex-shrink: 0; }
    .activity-info { flex: 1; }
    .activity-vehicle { font-size: 0.8rem; font-weight: 500; }
    .activity-meta { font-size: 0.75rem; color: var(--p-text-muted-color); }
    .activity-cost { font-size: 0.875rem; font-weight: 500; color: var(--p-green-600); }
    .suggestion-item {
      display: flex; gap: 0.75rem; align-items: flex-start;
      padding: 0.5rem 0; border-bottom: 1px solid var(--p-surface-200);
      font-size: 0.875rem;
    }
    .suggestion-item:last-child { border: none; }
    .suggestion-num {
      background: var(--p-primary-500); color: white;
      width: 20px; height: 20px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; flex-shrink: 0; margin-top: 1px;
    }
    .empty-state { text-align: center; padding: 1rem; color: var(--p-text-muted-color); font-size: 0.875rem; }
    .dashboard-card { height: 100%; }
  `],
})
export class DashboardComponent implements OnInit {
  summary           = signal<any>(null);
  recentActivity    = signal<any[]>([]);
  suggestions       = signal<string[]>([]);
  loadingActivity   = signal(true);
  loadingSuggestions = signal(true);

  constructor(
    readonly vehicles: VehicleService,
    readonly auth: AuthService,
    private readonly http: HttpClient,
  ) {}

  ngOnInit() {
    this.http.get<any>('/api/reports/dashboard').subscribe(data => {
      this.summary.set(data);
      this.recentActivity.set(data.recentActivity ?? []);
      this.loadingActivity.set(false);
    });

    this.http.get<{ suggestions: string[] }>('/api/ai/suggestions').subscribe({
      next:  r => { this.suggestions.set(r.suggestions); this.loadingSuggestions.set(false); },
      error: () => this.loadingSuggestions.set(false),
    });
  }

  colorFor(make: string): string {
    const colors = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4'];
    let hash = 0;
    for (const c of make) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
    return colors[hash % colors.length];
  }
}
