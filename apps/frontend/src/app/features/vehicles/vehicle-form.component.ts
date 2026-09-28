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
import { VehicleService, Vehicle, VehicleSpecs } from '../../core/services/vehicle.service';

const DEFAULT_FILTERS = [
  { name: 'Oil filter',   part: '', notes: '' },
  { name: 'Air filter',   part: '', notes: '' },
  { name: 'Fuel filter',  part: '', notes: '' },
  { name: 'Cabin filter', part: '', notes: '' },
];

function mergeSpecs(saved?: VehicleSpecs): VehicleSpecs {
  return {
    oil:     { type: '', capacity: '', filterPart: '', drainPlug: '', interval: '', ...saved?.oil },
    tires:   { front: '', rear: '', pressure: '', lugTorque: '', rotation: '', ...saved?.tires },
    spark:   { plug: '', gap: '', torque: '', socket: '', interval: '', ...saved?.spark },
    filters: saved?.filters?.length
      ? saved.filters.map(f => ({ name: f.name, part: f.part ?? '', notes: f.notes ?? '' }))
      : DEFAULT_FILTERS.map(f => ({ ...f })),
    notes: saved?.notes ?? [],
  };
}

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InputTextModule, InputNumberModule,
            ButtonModule, CardModule, MessageModule, FileUploadModule],
  template: `
    <div class="vf-page">
      <div class="vf-header">
        <a (click)="cancel()" class="vf-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          {{ isEdit ? 'Back to vehicle' : 'Vehicles' }}
        </a>
        <h1 class="vf-title">{{ isEdit ? 'Edit Vehicle' : 'Add Vehicle' }}</h1>
      </div>

      <!-- Tab bar -->
      <div class="vf-tab-bar">
        <button class="vf-tab" [class.active]="tab === 'details'" (click)="tab = 'details'">Details</button>
        <button class="vf-tab" [class.active]="tab === 'parts'"   (click)="tab = 'parts'">Service Parts</button>
      </div>

      <p-message *ngIf="error()" severity="error" [text]="error()!" styleClass="mb-3 w-full" />

      <!-- ── DETAILS TAB ── -->
      <div *ngIf="tab === 'details'" class="vf-card">
        <div class="vf-grid">
          <div class="vf-field">
            <label class="vf-label">Make <span class="req">*</span></label>
            <input pInputText [(ngModel)]="form.make" placeholder="Ford" class="w-full" />
          </div>
          <div class="vf-field">
            <label class="vf-label">Model <span class="req">*</span></label>
            <input pInputText [(ngModel)]="form.model" placeholder="F-150" class="w-full" />
          </div>
          <div class="vf-field">
            <label class="vf-label">Trim</label>
            <input pInputText [(ngModel)]="form.trim" placeholder="XLT" class="w-full" />
          </div>
          <div class="vf-field">
            <label class="vf-label">Year <span class="req">*</span></label>
            <p-inputNumber [(ngModel)]="form.year" [min]="1886" [max]="2030"
              [useGrouping]="false" placeholder="2015" styleClass="w-full" />
          </div>
          <div class="vf-field">
            <label class="vf-label">Current Mileage</label>
            <p-inputNumber [(ngModel)]="form.currentMileage" [min]="0"
              placeholder="45000" suffix=" mi" styleClass="w-full" />
          </div>
          <div class="vf-field">
            <label class="vf-label">VIN <span class="vf-hint">(stored uppercase)</span></label>
            <input pInputText [(ngModel)]="form.vin" placeholder="1FTFW1E8XNFA00001" class="w-full vf-upper-input" />
          </div>
          <div class="vf-field">
            <label class="vf-label">License Plate <span class="vf-hint">(stored uppercase)</span></label>
            <input pInputText [(ngModel)]="form.licensePlate" placeholder="ABC 1234" class="w-full vf-upper-input" />
          </div>
          <div class="vf-field">
            <label class="vf-label">Color <span class="vf-hint">(stored uppercase)</span></label>
            <input pInputText [(ngModel)]="form.color" placeholder="GREY" class="w-full vf-upper-input" />
          </div>
          <div class="vf-field vf-full">
            <label class="vf-check">
              <input type="checkbox" [(ngModel)]="form.outOfService" />
              <span>Out of service</span>
            </label>
            <span class="vf-hint">Parked or stored. Stays in the records, drops off the pickers, and no longer counts as on the road.</span>
          </div>
          <div class="vf-field vf-full">
            <label class="vf-label">Notes</label>
            <textarea pInputText [(ngModel)]="form.notes" rows="3"
              placeholder="Any notes about this vehicle..." class="w-full" style="resize:vertical"></textarea>
          </div>
        </div>
      </div>

      <!-- ── SERVICE PARTS TAB ── -->
      <div *ngIf="tab === 'parts'" class="vf-parts">

        <!-- Engine Oil -->
        <div class="vf-card">
          <div class="vf-section-head">
            <span class="vf-section-kicker">LUBRICATION</span>
            <h3 class="vf-section-title">Engine Oil</h3>
          </div>
          <div class="vf-grid">
            <div class="vf-field">
              <label class="vf-label">Oil type / grade</label>
              <input pInputText [(ngModel)]="specs.oil!.type" placeholder="5W-30 Full Synthetic" class="w-full" />
            </div>
            <div class="vf-field">
              <label class="vf-label">Capacity (with filter)</label>
              <input pInputText [(ngModel)]="specs.oil!.capacity" placeholder="5.7 qt" class="w-full" />
            </div>
            <div class="vf-field">
              <label class="vf-label">Filter P/N (WIX or OEM)</label>
              <input pInputText [(ngModel)]="specs.oil!.filterPart" placeholder="WIX 51365" class="w-full" />
            </div>
            <div class="vf-field">
              <label class="vf-label">Drain plug torque</label>
              <input pInputText [(ngModel)]="specs.oil!.drainPlug" placeholder="26 ft-lb" class="w-full" />
            </div>
            <div class="vf-field vf-full">
              <label class="vf-label">Change interval</label>
              <input pInputText [(ngModel)]="specs.oil!.interval" placeholder="5,000 mi / 6 months" class="w-full" />
            </div>
          </div>
        </div>

        <!-- Tires -->
        <div class="vf-card">
          <div class="vf-section-head">
            <span class="vf-section-kicker">WHEELS</span>
            <h3 class="vf-section-title">Tires</h3>
          </div>
          <div class="vf-grid">
            <div class="vf-field">
              <label class="vf-label">Front tire size</label>
              <input pInputText [(ngModel)]="specs.tires!.front" placeholder="P265/70R17" class="w-full" />
            </div>
            <div class="vf-field">
              <label class="vf-label">Rear tire size</label>
              <input pInputText [(ngModel)]="specs.tires!.rear" placeholder="P265/70R17" class="w-full" />
            </div>
            <div class="vf-field">
              <label class="vf-label">Inflation pressure</label>
              <input pInputText [(ngModel)]="specs.tires!.pressure" placeholder="35 PSI" class="w-full" />
            </div>
            <div class="vf-field">
              <label class="vf-label">Lug nut torque</label>
              <input pInputText [(ngModel)]="specs.tires!.lugTorque" placeholder="150 ft-lb" class="w-full" />
            </div>
            <div class="vf-field vf-full">
              <label class="vf-label">Rotation interval</label>
              <input pInputText [(ngModel)]="specs.tires!.rotation" placeholder="7,500 mi" class="w-full" />
            </div>
          </div>
        </div>

        <!-- Spark Plugs -->
        <div class="vf-card">
          <div class="vf-section-head">
            <span class="vf-section-kicker">IGNITION</span>
            <h3 class="vf-section-title">Spark Plugs</h3>
          </div>
          <div class="vf-grid">
            <div class="vf-field">
              <label class="vf-label">Plug P/N</label>
              <input pInputText [(ngModel)]="specs.spark!.plug" placeholder="Motorcraft SP-509" class="w-full" />
            </div>
            <div class="vf-field">
              <label class="vf-label">Gap</label>
              <input pInputText [(ngModel)]="specs.spark!.gap" placeholder='0.054"' class="w-full" />
            </div>
            <div class="vf-field">
              <label class="vf-label">Install torque</label>
              <input pInputText [(ngModel)]="specs.spark!.torque" placeholder="13 ft-lb" class="w-full" />
            </div>
            <div class="vf-field">
              <label class="vf-label">Socket size</label>
              <input pInputText [(ngModel)]="specs.spark!.socket" placeholder='5/8"' class="w-full" />
            </div>
            <div class="vf-field vf-full">
              <label class="vf-label">Replacement interval</label>
              <input pInputText [(ngModel)]="specs.spark!.interval" placeholder="60,000 mi" class="w-full" />
            </div>
          </div>
        </div>

        <!-- Filters table -->
        <div class="vf-card">
          <div class="vf-section-head">
            <span class="vf-section-kicker">REPLACEABLES</span>
            <h3 class="vf-section-title">Filters</h3>
          </div>
          <div class="vf-filter-table">
            <div class="vf-fthead">Filter</div>
            <div class="vf-fthead">Part number</div>
            <div class="vf-fthead">Notes</div>
            <ng-container *ngFor="let f of specs.filters">
              <div class="vf-ftcell vf-ftcell--name">{{ f.name }}</div>
              <div class="vf-ftcell">
                <input pInputText [(ngModel)]="f.part" placeholder="WIX 51365" class="w-full" />
              </div>
              <div class="vf-ftcell">
                <input pInputText [(ngModel)]="f.notes" placeholder="Standard spin-on" class="w-full" />
              </div>
            </ng-container>
          </div>
        </div>

        <!-- Service notes -->
        <div class="vf-card">
          <div class="vf-section-head">
            <span class="vf-section-kicker">TIPS &amp; GOTCHAS</span>
            <h3 class="vf-section-title">Service Notes</h3>
          </div>
          <div class="vf-field">
            <label class="vf-label">One note per line</label>
            <textarea pInputText [(ngModel)]="serviceNotesText" rows="6"
              placeholder="Always torque lug nuts in a star pattern.&#10;Run the recommended octane — premium-required engines don't benefit from less."
              class="w-full" style="resize:vertical;font-size:13px;line-height:1.6"></textarea>
          </div>
        </div>

      </div><!-- /parts tab -->

      <!-- Action bar -->
      <div class="vf-actions">
        <p-button label="Cancel" severity="secondary" (onClick)="cancel()" />
        <p-button [label]="isEdit ? 'Save changes' : 'Add vehicle'"
          icon="pi pi-check" [loading]="saving()" (onClick)="submit()" />
      </div>
    </div>
  `,
  styles: [`
    .vf-page { max-width: 860px; margin: 0 auto; padding: 28px 24px 80px; font-family: 'Archivo', system-ui, sans-serif; }

    /* Header */
    .vf-header { margin-bottom: 20px; }
    .vf-back {
      display: inline-flex; align-items: center; gap: 7px; cursor: pointer;
      color: var(--fg-3); font-size: 13px; font-weight: 600; text-decoration: none;
      margin-bottom: 12px;
    }
    .vf-back:hover { color: var(--accent); }
    .vf-title { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -.02em; color: var(--fg); }

    /* Tab bar */
    .vf-tab-bar {
      display: flex; gap: 4px; padding: 4px; margin-bottom: 20px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
      width: fit-content;
    }
    .vf-tab {
      padding: 9px 18px; border-radius: 9px; border: none; background: transparent;
      color: var(--fg-3); font-size: 13px; font-weight: 700; cursor: pointer;
      font-family: 'Archivo', system-ui, sans-serif; transition: background 140ms, color 140ms;
    }
    .vf-tab.active { background: var(--surface-2); color: var(--fg); box-shadow: inset 0 0 0 1px var(--border-strong); }

    /* Cards */
    .vf-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
      padding: 20px 22px; margin-bottom: 16px;
    }

    /* Section heading inside parts cards */
    .vf-section-head { margin-bottom: 16px; }
    .vf-section-kicker {
      display: block; font-size: 9.5px; letter-spacing: .2em; color: var(--accent);
      font-family: 'JetBrains Mono', monospace; margin-bottom: 3px;
    }
    .vf-section-title { margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -.01em; color: var(--fg); }

    /* Form grid */
    .vf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .vf-field { display: flex; flex-direction: column; gap: 5px; }
    .vf-full  { grid-column: 1 / -1; }
    .vf-label { font-size: 12px; font-weight: 600; color: var(--fg-2); }
    .vf-hint  { font-size: 11px; font-weight: 400; color: var(--fg-3); }
    .vf-check { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--fg); cursor: pointer; }
    .vf-check input { width: 16px; height: 16px; accent-color: var(--accent); }
    .req      { color: var(--accent); }
    .vf-upper-input { text-transform: uppercase; }

    /* Filter table */
    .vf-filter-table { display: grid; grid-template-columns: 1.2fr 1.4fr 2fr; gap: 0; }
    .vf-fthead {
      font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--fg-3);
      font-family: 'JetBrains Mono', monospace;
      padding: 8px 10px 8px 0; border-bottom: 1px solid var(--border-strong);
    }
    .vf-ftcell { padding: 10px 8px 10px 0; border-bottom: 1px dashed var(--border); display: flex; align-items: center; }
    .vf-ftcell--name { font-size: 13px; font-weight: 600; color: var(--fg-2); }

    /* Parts area */
    .vf-parts { }

    /* Actions */
    .vf-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }

    @media (max-width: 600px) {
      .vf-grid { grid-template-columns: 1fr; }
      .vf-filter-table { grid-template-columns: 1fr 1fr; }
      .vf-fthead:nth-child(3), .vf-ftcell:nth-child(3n) { display: none; }
    }
  `],
})
export class VehicleFormComponent implements OnInit {
  isEdit    = false;
  vehicleId: string | null = null;
  tab       = 'details';
  saving    = signal(false);
  error     = signal<string | null>(null);

  form: Partial<Vehicle> = {
    make: '', model: '', trim: '', year: undefined,
    currentMileage: undefined, vin: '', licensePlate: '', color: '', notes: '',
    outOfService: false,
  };

  specs: VehicleSpecs = mergeSpecs();

  get serviceNotesText(): string {
    return (this.specs.notes ?? []).join('\n');
  }
  set serviceNotesText(v: string) {
    this.specs.notes = v.split('\n').map(s => s.trim()).filter(Boolean);
  }

  constructor(
    private readonly svc:    VehicleService,
    private readonly router: Router,
    private readonly route:  ActivatedRoute,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.vehicleId = id;
      this.svc.getOne(id).subscribe(v => {
        Object.assign(this.form, v);
        this.specs = mergeSpecs(v.specs);
      });
    }
  }

  cancel() {
    if (this.isEdit && this.vehicleId) {
      this.router.navigate(['/vehicles', this.vehicleId]);
    } else {
      this.router.navigate(['/vehicles']);
    }
  }

  submit() {
    if (!this.form.make || !this.form.model || !this.form.year) {
      this.error.set('Make, model and year are required.'); return;
    }
    this.saving.set(true); this.error.set(null);

    const payload: Partial<Vehicle> = {
      make:           this.form.make,
      model:          this.form.model,
      trim:           this.form.trim?.trim() || undefined,
      year:           this.form.year,
      currentMileage: this.form.currentMileage ?? undefined,
      vin:            this.form.vin?.trim().toUpperCase() || undefined,
      licensePlate:   this.form.licensePlate?.trim().toUpperCase() || undefined,
      color:          this.form.color?.trim().toUpperCase() || undefined,
      notes:          this.form.notes,
      outOfService:   !!this.form.outOfService,
      specs:          this.specs,
    };

    const id = this.route.snapshot.paramMap.get('id');
    const obs = id
      ? this.svc.update(id, payload)
      : this.svc.create(payload);

    obs.subscribe({
      next:  v  => this.router.navigate(['/vehicles', v.id]),
      error: e  => { this.error.set(e.error?.message ?? 'Save failed'); this.saving.set(false); },
    });
  }
}
