import { Component, OnInit, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient }   from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { CardModule }   from 'primeng/card';
import { ChartModule }  from 'primeng/chart';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule }  from '@angular/forms';
import { VehicleService } from '../../core/services/vehicle.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, CardModule, ChartModule, DropdownModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Reports</h1>
        <div class="header-controls">
          <p-dropdown [options]="vehicleOptions" [(ngModel)]="selectedVehicleId"
            optionLabel="label" optionValue="value"
            placeholder="All vehicles" [showClear]="true"
            (onChange)="reload()" styleClass="w-full" />
          <p-dropdown [options]="yearOptions" [(ngModel)]="selectedYear"
            (onChange)="reload()" styleClass="w-full" />
          <p-button label="Export CSV" icon="pi pi-download"
            severity="secondary" (onClick)="exportCsv()" />
        </div>
      </div>

      <div class="charts-grid">
        <!-- Monthly cost bar chart -->
        <p-card header="Monthly maintenance cost">
          <p-chart type="bar" [data]="monthlyChartData()" [options]="barOptions" height="260px" />
        </p-card>

        <!-- Cost by type doughnut -->
        <p-card header="Cost by service type">
          <p-chart type="doughnut" [data]="typeChartData()" [options]="doughnutOptions" height="260px" />
        </p-card>

        <!-- Fuel efficiency line chart -->
        <p-card header="Fuel efficiency trend" styleClass="full-width-card">
          <p-chart type="line" [data]="fuelChartData()" [options]="lineOptions" height="220px" />
        </p-card>
      </div>
    </div>
  `,
  styles: [`
    .page{max-width:1100px;margin:0 auto;}
    .page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;gap:1rem;flex-wrap:wrap;}
    h1{margin:0;font-size:1.5rem;font-weight:600;}
    .header-controls{display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap;}
    .charts-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
    :host ::ng-deep .full-width-card{grid-column:1/-1;}
    @media(max-width:700px){.charts-grid{grid-template-columns:1fr;}}
  `],
})
export class ReportsComponent implements OnInit {
  monthlyChartData = signal<any>({ labels: [], datasets: [] });
  typeChartData    = signal<any>({ labels: [], datasets: [] });
  fuelChartData    = signal<any>({ labels: [], datasets: [] });
  selectedVehicleId: string | null = null;
  selectedYear = new Date().getFullYear();

  yearOptions  = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  get vehicleOptions() {
    return [
      { label: 'All vehicles', value: null },
      ...this.vehicleSvc.vehicles().map(v => ({ label: `${v.year} ${v.make} ${v.model}`, value: v.id })),
    ];
  }

  barOptions      = { responsive: true, plugins: { legend: { display: false } } };
  doughnutOptions = { responsive: true, plugins: { legend: { position: 'right' } } };
  lineOptions     = { responsive: true, plugins: { legend: { display: false } },
    scales: { y: { title: { display: true, text: 'MPG' } } } };

  CHART_COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4','#f97316'];

  constructor(private http: HttpClient, readonly vehicleSvc: VehicleService) {}

  ngOnInit() { this.reload(); }

  reload() {
    const vid  = this.selectedVehicleId ? `&vehicleId=${this.selectedVehicleId}` : '';
    const year = this.selectedYear;

    this.http.get<any>(`/api/reports/cost-by-month?year=${year}${vid}`).subscribe(data => {
      this.monthlyChartData.set({
        labels:   data.months.map((m: any) => m.label),
        datasets: [{ label: 'Cost', data: data.months.map((m: any) => m.total),
          backgroundColor: '#3b82f6', borderRadius: 4 }],
      });
    });

    this.http.get<any[]>(`/api/reports/cost-by-type${vid ? '?' + vid.slice(1) : ''}`).subscribe(data => {
      this.typeChartData.set({
        labels:   data.map(d => d.type),
        datasets: [{ data: data.map(d => d._sum.cost ?? 0), backgroundColor: this.CHART_COLORS }],
      });
    });

    this.http.get<any[]>(`/api/reports/fuel-trend${vid ? '?' + vid.slice(1) : ''}`).subscribe(data => {
      this.fuelChartData.set({
        labels:   data.map(d => new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })),
        datasets: [{ label: 'MPG', data: data.map(d => d.mpg ?? null),
          borderColor: '#10b981', tension: 0.3, fill: false, pointRadius: 3 }],
      });
    });
  }

  exportCsv() {
    const vid = this.selectedVehicleId ? `?vehicleId=${this.selectedVehicleId}` : '';
    window.open(`/api/reports/export/maintenance.csv${vid}`, '_blank');
  }
}
