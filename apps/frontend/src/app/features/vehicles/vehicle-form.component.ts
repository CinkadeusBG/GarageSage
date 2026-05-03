import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }          from '@angular/common';
import { FormsModule }           from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { InputTextModule }       from 'primeng/inputtext';
import { InputNumberModule }     from 'primeng/inputnumber';
import { ButtonModule }          from 'primeng/button';
import { CardModule }            from 'primeng/card';
import { MessageModule }         from 'primeng/message';
import { FileUploadModule }      from 'primeng/fileupload';
import { VehicleService, Vehicle } from '../../core/services/vehicle.service';

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InputTextModule, InputNumberModule, ButtonModule, CardModule, MessageModule, FileUploadModule],
  template: `
    <div class="page">
      <div class="page-header">
        <a routerLink="/vehicles" class="back-link">
          <i class="pi pi-arrow-left"></i> Vehicles
        </a>
      </div>

      <p-card [header]="isEdit ? 'Edit Vehicle' : 'Add Vehicle'">
        <p-message *ngIf="error()" severity="error" [text]="error()!" styleClass="mb-3 w-full" />

        <div class="form-grid">
          <div class="field">
            <label>Make *</label>
            <input pInputText [(ngModel)]="form.make" placeholder="Toyota" class="w-full" />
          </div>
          <div class="field">
            <label>Model *</label>
            <input pInputText [(ngModel)]="form.model" placeholder="Camry" class="w-full" />
          </div>
          <div class="field">
            <label>Year *</label>
            <p-inputNumber [(ngModel)]="form.year" [min]="1886" [max]="2027"
              [useGrouping]="false" placeholder="2022" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Current Mileage</label>
            <p-inputNumber [(ngModel)]="form.currentMileage" [min]="0"
              placeholder="45000" suffix=" mi" styleClass="w-full" />
          </div>
          <div class="field">
            <label>VIN (optional)</label>
            <input pInputText [(ngModel)]="form.vin" placeholder="1HGBH41JXMN109186" class="w-full" />
          </div>
          <div class="field">
            <label>License Plate (optional)</label>
            <input pInputText [(ngModel)]="form.licensePlate" placeholder="ABC 1234" class="w-full" />
          </div>
          <div class="field">
            <label>Color (optional)</label>
            <input pInputText [(ngModel)]="form.color" placeholder="Silver" class="w-full" />
          </div>
          <div class="field full-width">
            <label>Notes (optional)</label>
            <textarea pInputText [(ngModel)]="form.notes" rows="3"
              placeholder="Any notes about this vehicle..." class="w-full" style="resize:vertical"></textarea>
          </div>
        </div>

        <div class="form-actions">
          <p-button label="Cancel" severity="secondary" routerLink="/vehicles" />
          <p-button [label]="isEdit ? 'Save changes' : 'Add vehicle'"
            icon="pi pi-check" [loading]="saving()" (onClick)="submit()" />
        </div>
      </p-card>
    </div>
  `,
  styles: [`
    .page { max-width: 700px; margin: 0 auto; }
    .page-header { margin-bottom: 1rem; }
    .back-link { color:var(--p-text-muted-color);text-decoration:none;font-size:0.875rem;display:inline-flex;align-items:center;gap:0.4rem; }
    .back-link:hover { color:var(--p-primary-500); }
    .form-grid { display:grid;grid-template-columns:1fr 1fr;gap:1rem; }
    .field { display:flex;flex-direction:column;gap:0.35rem; }
    .field label { font-size:0.875rem;font-weight:500; }
    .full-width { grid-column: 1 / -1; }
    .form-actions { display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1.5rem; }
    @media (max-width:600px) { .form-grid { grid-template-columns:1fr; } }
  `],
})
export class VehicleFormComponent implements OnInit {
  isEdit  = false;
  saving  = signal(false);
  error   = signal<string | null>(null);

  form: Partial<Vehicle> = {
    make: '', model: '', year: new Date().getFullYear(),
    currentMileage: 0, vin: '', licensePlate: '', color: '', notes: '',
  };

  constructor(
    private readonly svc:    VehicleService,
    private readonly router: Router,
    private readonly route:  ActivatedRoute,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.svc.getOne(id).subscribe(v => Object.assign(this.form, v));
    }
  }

  submit() {
    if (!this.form.make || !this.form.model || !this.form.year) {
      this.error.set('Make, model and year are required.'); return;
    }
    this.saving.set(true); this.error.set(null);
    const id = this.route.snapshot.paramMap.get('id');
    const obs = id
      ? this.svc.update(id, this.form)
      : this.svc.create(this.form);

    obs.subscribe({
      next:  v  => this.router.navigate(['/vehicles', v.id]),
      error: e  => { this.error.set(e.error?.message ?? 'Save failed'); this.saving.set(false); },
    });
  }
}
