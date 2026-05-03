import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient }     from '@angular/common/http';
import { InputTextModule }    from 'primeng/inputtext';
import { InputNumberModule }  from 'primeng/inputnumber';
import { CalendarModule }     from 'primeng/calendar';
import { DropdownModule }     from 'primeng/dropdown';
import { ButtonModule }       from 'primeng/button';
import { CardModule }         from 'primeng/card';
import { MessageModule }      from 'primeng/message';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { VehicleService }     from '../../core/services/vehicle.service';

const COMMON_TYPES = [
  'Oil Change','Tire Rotation','Air Filter','Cabin Filter','Brakes',
  'Transmission Service','Coolant Flush','Spark Plugs','Battery',
  'Wheel Alignment','Wiper Blades','Inspection','Other',
];

@Component({
  selector: 'app-maintenance-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InputTextModule, InputNumberModule,
    CalendarModule, DropdownModule, ButtonModule, CardModule, MessageModule, AutoCompleteModule],
  template: `
    <div class="page">
      <div class="page-header">
        <a routerLink="/maintenance" class="back-link">
          <i class="pi pi-arrow-left"></i> Maintenance
        </a>
      </div>

      <p-card [header]="isEdit ? 'Edit Service Log' : 'Log Service'">
        <p-message *ngIf="error()" severity="error" [text]="error()!" styleClass="mb-3 w-full" />

        <div class="form-grid">
          <div class="field full-width">
            <label>Vehicle *</label>
            <p-dropdown [options]="vehicleOptions" [(ngModel)]="form.vehicleId"
              optionLabel="label" optionValue="value"
              placeholder="Select vehicle" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Service type *</label>
            <p-dropdown [options]="serviceTypes" [(ngModel)]="form.type"
              [editable]="true" placeholder="Select or type service" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Date *</label>
            <p-calendar [(ngModel)]="form.date" [showIcon]="true"
              dateFormat="mm/dd/yy" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Mileage *</label>
            <p-inputNumber [(ngModel)]="form.mileage" [min]="0"
              suffix=" mi" [useGrouping]="true" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Cost</label>
            <p-inputNumber [(ngModel)]="form.cost" mode="currency" currency="USD"
              locale="en-US" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Shop / Dealer</label>
            <input pInputText [(ngModel)]="form.shop" placeholder="Quick Lube" class="w-full" />
          </div>
          <div class="field">
            <label>Technician</label>
            <input pInputText [(ngModel)]="form.technician" placeholder="Name" class="w-full" />
          </div>
          <div class="field full-width">
            <label>Tags</label>
            <p-autoComplete [(ngModel)]="form.tags" [multiple]="true" [suggestions]="[]"
              (completeMethod)="$event" placeholder="Add tag and press Enter" styleClass="w-full" />
          </div>
          <div class="field full-width">
            <label>Notes / Description</label>
            <textarea pInputText [(ngModel)]="form.description" rows="3"
              placeholder="Anything notable about this service..." class="w-full" style="resize:vertical"></textarea>
          </div>
        </div>

        <div class="form-actions">
          <p-button label="Cancel" severity="secondary" routerLink="/maintenance" />
          <p-button [label]="isEdit ? 'Save changes' : 'Save log'"
            icon="pi pi-check" [loading]="saving()" (onClick)="submit()" />
        </div>
      </p-card>
    </div>
  `,
  styles: [`
    .page { max-width:700px;margin:0 auto; }
    .page-header { margin-bottom:1rem; }
    .back-link { color:var(--p-text-muted-color);text-decoration:none;font-size:0.875rem;display:inline-flex;align-items:center;gap:0.4rem; }
    .form-grid { display:grid;grid-template-columns:1fr 1fr;gap:1rem; }
    .field { display:flex;flex-direction:column;gap:0.35rem; }
    .field label { font-size:0.875rem;font-weight:500; }
    .full-width { grid-column:1/-1; }
    .form-actions { display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1.5rem; }
    @media(max-width:600px){.form-grid{grid-template-columns:1fr;}}
  `],
})
export class MaintenanceFormComponent implements OnInit {
  isEdit  = false;
  saving  = signal(false);
  error   = signal<string | null>(null);
  serviceTypes = COMMON_TYPES;

  form: any = {
    vehicleId: null, type: null, date: new Date(),
    mileage: null, cost: null, shop: null,
    technician: null, description: null, tags: [],
  };

  get vehicleOptions() {
    return this.vehicleSvc.vehicles().map(v => ({
      label: `${v.year} ${v.make} ${v.model}`,
      value: v.id,
    }));
  }

  constructor(
    private readonly http: HttpClient,
    private readonly vehicleSvc: VehicleService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit() {
    const vehicleId = this.route.snapshot.queryParamMap.get('vehicleId');
    if (vehicleId) this.form.vehicleId = vehicleId;

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.http.get<any>(`/api/maintenance/${id}`).subscribe(log => {
        Object.assign(this.form, log, { date: new Date(log.date) });
      });
    }
  }

  submit() {
    if (!this.form.vehicleId || !this.form.type || !this.form.date || !this.form.mileage) {
      this.error.set('Vehicle, type, date and mileage are required.'); return;
    }
    this.saving.set(true); this.error.set(null);
    const payload = { ...this.form, date: this.form.date.toISOString() };
    const id = this.route.snapshot.paramMap.get('id');
    const req = id
      ? this.http.put<any>(`/api/maintenance/${id}`, payload)
      : this.http.post<any>('/api/maintenance', payload);

    req.subscribe({
      next:  () => this.router.navigate(['/maintenance']),
      error: e  => { this.error.set(e.error?.message ?? 'Save failed'); this.saving.set(false); },
    });
  }
}
