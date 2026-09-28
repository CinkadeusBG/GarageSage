import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient }     from '@angular/common/http';
import { InputTextModule }   from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule }    from 'primeng/dropdown';
import { ButtonModule }      from 'primeng/button';
import { CardModule }        from 'primeng/card';
import { MessageModule }     from 'primeng/message';
import { VehicleService }    from '../../core/services/vehicle.service';

@Component({
  selector: 'app-reminder-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InputTextModule, InputNumberModule, DropdownModule, ButtonModule, CardModule, MessageModule],
  template: `
    <div class="page">
      <div class="page-header">
        <a routerLink="/reminders" class="back-link"><i class="pi pi-arrow-left"></i> Reminders</a>
      </div>
      <p-card header="Add Reminder">
        <p-message *ngIf="error()" severity="error" [text]="error()!" styleClass="mb-3 w-full" />
        <div class="form-grid">
          <div class="field full-width">
            <label>Vehicle *</label>
            <p-dropdown [options]="vehicleOptions" [(ngModel)]="form.vehicleId"
              optionLabel="label" optionValue="value" placeholder="Select vehicle" styleClass="w-full" />
          </div>
          <div class="field full-width">
            <label>Task title *</label>
            <input pInputText [(ngModel)]="form.title" placeholder="e.g. Oil Change" class="w-full" />
          </div>
          <div class="field full-width">
            <label>Description (optional)</label>
            <input pInputText [(ngModel)]="form.description" placeholder="Details…" class="w-full" />
          </div>
          <div class="field">
            <label>Repeat every N miles</label>
            <p-inputNumber [(ngModel)]="form.intervalMileage" suffix=" mi" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Repeat every N days</label>
            <p-inputNumber [(ngModel)]="form.intervalDays" suffix=" days" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Last done at (mileage)</label>
            <p-inputNumber [(ngModel)]="form.lastDoneMileage" suffix=" mi" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Priority</label>
            <p-dropdown [options]="priorities" [(ngModel)]="form.priority" styleClass="w-full" />
          </div>
        </div>
        <div class="form-actions">
          <p-button label="Cancel" severity="secondary" routerLink="/reminders" />
          <p-button label="Save reminder" icon="pi pi-check" [loading]="saving()" (onClick)="submit()" />
        </div>
      </p-card>
    </div>
  `,
  styles: [`
    .page{max-width:700px;margin:0 auto;} .page-header{margin-bottom:1rem;}
    .back-link{color:var(--p-text-muted-color);text-decoration:none;font-size:0.875rem;display:inline-flex;align-items:center;gap:0.4rem;}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
    .field{display:flex;flex-direction:column;gap:0.35rem;} .field label{font-size:0.875rem;font-weight:500;}
    .full-width{grid-column:1/-1;} .form-actions{display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1.5rem;}
    @media(max-width:600px){.form-grid{grid-template-columns:1fr;}}
  `],
})
export class ReminderFormComponent implements OnInit {
  saving = signal(false); error = signal<string | null>(null);
  priorities = ['LOW','MEDIUM','HIGH','CRITICAL'];
  form: any = { vehicleId: null, title: '', description: '', intervalMileage: null, intervalDays: null, lastDoneMileage: null, priority: 'MEDIUM' };

  get vehicleOptions() {
    return this.vehicleSvc.byYear().map(v => ({ label: this.vehicleSvc.displayName(v), value: v.id }));
  }

  constructor(private http: HttpClient, private vehicleSvc: VehicleService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    const vid = this.route.snapshot.queryParamMap.get('vehicleId');
    if (vid) this.form.vehicleId = vid;
  }

  submit() {
    if (!this.form.vehicleId || !this.form.title) { this.error.set('Vehicle and title are required.'); return; }
    this.saving.set(true); this.error.set(null);
    this.http.post<any>('/api/reminders', this.form).subscribe({
      next:  () => this.router.navigate(['/reminders']),
      error: e  => { this.error.set(e.error?.message ?? 'Save failed'); this.saving.set(false); },
    });
  }
}
