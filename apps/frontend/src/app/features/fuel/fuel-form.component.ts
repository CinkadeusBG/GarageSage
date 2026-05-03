import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient }    from '@angular/common/http';
import { InputTextModule }   from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule }    from 'primeng/calendar';
import { DropdownModule }    from 'primeng/dropdown';
import { CheckboxModule }    from 'primeng/checkbox';
import { ButtonModule }      from 'primeng/button';
import { CardModule }        from 'primeng/card';
import { MessageModule }     from 'primeng/message';
import { VehicleService }    from '../../core/services/vehicle.service';

@Component({
  selector: 'app-fuel-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InputTextModule, InputNumberModule,
    CalendarModule, DropdownModule, CheckboxModule, ButtonModule, CardModule, MessageModule],
  template: `
    <div class="page">
      <div class="page-header">
        <a routerLink="/fuel" class="back-link"><i class="pi pi-arrow-left"></i> Fuel</a>
      </div>
      <p-card header="Add Fill-up">
        <p-message *ngIf="error()" severity="error" [text]="error()!" styleClass="mb-3 w-full" />
        <div class="form-grid">
          <div class="field full-width">
            <label>Vehicle *</label>
            <p-dropdown [options]="vehicleOptions" [(ngModel)]="form.vehicleId"
              optionLabel="label" optionValue="value" placeholder="Select vehicle" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Date *</label>
            <p-calendar [(ngModel)]="form.date" [showIcon]="true" dateFormat="mm/dd/yy" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Mileage *</label>
            <p-inputNumber [(ngModel)]="form.mileage" suffix=" mi" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Gallons</label>
            <p-inputNumber [(ngModel)]="form.gallons" [minFractionDigits]="3" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Liters</label>
            <p-inputNumber [(ngModel)]="form.liters" [minFractionDigits]="2" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Price per unit</label>
            <p-inputNumber [(ngModel)]="form.pricePerUnit" mode="currency" currency="USD" [minFractionDigits]="3" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Total cost</label>
            <p-inputNumber [(ngModel)]="form.totalCost" mode="currency" currency="USD" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Station (optional)</label>
            <input pInputText [(ngModel)]="form.station" placeholder="Shell, Costco…" class="w-full" />
          </div>
          <div class="field full-width">
            <p-checkbox [(ngModel)]="form.fullTank" [binary]="true" label="Full tank (needed for MPG calculation)" />
          </div>
        </div>
        <div class="form-actions">
          <p-button label="Cancel" severity="secondary" routerLink="/fuel" />
          <p-button label="Save fill-up" icon="pi pi-check" [loading]="saving()" (onClick)="submit()" />
        </div>
      </p-card>
    </div>
  `,
  styles: [`
    .page{max-width:700px;margin:0 auto;}
    .page-header{margin-bottom:1rem;}
    .back-link{color:var(--p-text-muted-color);text-decoration:none;font-size:0.875rem;display:inline-flex;align-items:center;gap:0.4rem;}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
    .field{display:flex;flex-direction:column;gap:0.35rem;}
    .field label{font-size:0.875rem;font-weight:500;}
    .full-width{grid-column:1/-1;}
    .form-actions{display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1.5rem;}
    @media(max-width:600px){.form-grid{grid-template-columns:1fr;}}
  `],
})
export class FuelFormComponent implements OnInit {
  saving = signal(false);
  error  = signal<string | null>(null);
  form: any = { vehicleId: null, date: new Date(), mileage: null, gallons: null, liters: null,
    pricePerUnit: null, totalCost: null, station: null, fullTank: true };

  get vehicleOptions() {
    return this.vehicleSvc.vehicles().map(v => ({ label: `${v.year} ${v.make} ${v.model}`, value: v.id }));
  }

  constructor(private http: HttpClient, private vehicleSvc: VehicleService,
    private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    const vid = this.route.snapshot.queryParamMap.get('vehicleId');
    if (vid) this.form.vehicleId = vid;
  }

  submit() {
    if (!this.form.vehicleId || !this.form.date || !this.form.mileage) {
      this.error.set('Vehicle, date and mileage are required.'); return;
    }
    this.saving.set(true); this.error.set(null);
    this.http.post<any>('/api/fuel', { ...this.form, date: this.form.date.toISOString() }).subscribe({
      next:  () => this.router.navigate(['/fuel']),
      error: e  => { this.error.set(e.error?.message ?? 'Save failed'); this.saving.set(false); },
    });
  }
}
