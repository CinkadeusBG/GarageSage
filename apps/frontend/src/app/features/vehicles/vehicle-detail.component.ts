import {
  Component, OnInit, signal, computed,
  ViewEncapsulation, ElementRef, ViewChild
} from '@angular/core';
import { CommonModule }      from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { HttpClient }        from '@angular/common/http';
import { FormsModule }       from '@angular/forms';
import { VehicleService, Vehicle, VehicleSpecs } from '../../core/services/vehicle.service';
import { MakeLogoComponent } from '../../core/make-logo.component';

/* ── Merge saved specs with sensible placeholder defaults ── */
function buildParts(saved?: VehicleSpecs) {
  return {
    oil: {
      type:       saved?.oil?.type       || 'Consult owner manual',
      capacity:   saved?.oil?.capacity   || '—',
      filterPart: saved?.oil?.filterPart || 'WIX — see filter lookup',
      drainPlug:  saved?.oil?.drainPlug  || 'See manual',
      interval:   saved?.oil?.interval   || '3,000–5,000 mi',
    },
    spark: {
      plug:     saved?.spark?.plug     || 'See owner manual',
      gap:      saved?.spark?.gap      || '—',
      torque:   saved?.spark?.torque   || '—',
      socket:   saved?.spark?.socket   || '—',
      interval: saved?.spark?.interval || '30,000 mi / annually',
    },
    tires: {
      front:     saved?.tires?.front     || '—',
      rear:      saved?.tires?.rear      || '—',
      pressure:  saved?.tires?.pressure  || '—',
      lugTorque: saved?.tires?.lugTorque || '—',
      rotation:  saved?.tires?.rotation  || '—',
    },
    filters: saved?.filters?.length ? saved.filters : [
      { name: 'Oil filter',   part: 'WIX — lookup by year/make', notes: 'Standard spin-on' },
      { name: 'Air filter',   part: 'WIX — lookup by year/make', notes: 'Panel or round, engine bay' },
      { name: 'Fuel filter',  part: 'WIX — lookup by year/make', notes: 'Inline, between pump and carb/FI' },
      { name: 'Cabin filter', part: 'WIX — lookup by year/make', notes: 'Replace annually or 15k mi' },
    ],
    notes: saved?.notes?.length ? saved.notes : [
      'Always check vehicle-specific service bulletin before first DIY service.',
      'Drain plug torque varies by engine — use a torque wrench, not estimated feel.',
      'Run the recommended octane; premium-required engines do not benefit from less.',
      'Record every service with date, mileage, and parts used for resale value.',
      'Inspect coolant level and colour at every oil change — flush every 2–5 years.',
    ],
  };
}

const TAG_COLORS: Record<string, string> = {
  'Oil Change':            'oklch(0.78 0.14 150)',
  'Brakes':                'oklch(0.7 0.18 25)',
  'Engine':                'oklch(0.78 0.14 150)',
  'Tires':                 'oklch(0.82 0.14 75)',
  'Drivetrain':            'oklch(0.72 0.14 220)',
  'Routine':               'oklch(0.78 0.10 300)',
  'Inspection':            'var(--fg-2)',
  'Transmission Service':  'oklch(0.72 0.14 220)',
  'Coolant Flush':         'oklch(0.72 0.14 220)',
  'Other':                 'var(--fg-3)',
};
const tagColor = (t: string) => TAG_COLORS[t] ?? 'var(--fg-3)';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MakeLogoComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
<!-- ═══════════════════════════ ODOMETER DIALOG ═══════════════════════════ -->
<div *ngIf="odoOpen()" class="gs-overlay" (click)="odoOpen.set(false)">
  <form class="gs-dialog" (click)="$event.stopPropagation()" (ngSubmit)="submitOdo()">
    <div class="gs-dialog-spot"></div>
    <div class="gs-kicker gs-upper">Update</div>
    <h3 class="gs-dialog-title">Log odometer reading</h3>
    <p class="gs-dialog-sub">
      Last entry: <span class="gs-mono">{{ lastOilOdo() | number:'1.0-0' }} mi</span>
    </p>
    <label class="gs-dialog-label">
      <span class="gs-mono gs-upper" style="font-size:9.5px;letter-spacing:.18em;color:var(--fg-3)">Current reading</span>
      <div class="gs-dialog-input-wrap" [class.error]="odoError()">
        <input #odoInput type="text" inputmode="numeric" [ngModel]="odoValue()" (ngModelChange)="odoValue.set($event); odoError.set('')" name="odoValue"
          class="gs-odo-input" />
        <span class="gs-mono" style="font-size:13px;color:var(--fg-3)">mi</span>
      </div>
    </label>
    <div class="gs-dialog-hint" [class.danger]="odoError()">
      {{ odoError() || odoDeltaHint() }}
    </div>
    <div class="gs-dialog-actions">
      <button type="button" class="gs-btn-ghost" (click)="odoOpen.set(false)">Cancel</button>
      <button type="submit" class="gs-btn-primary" [disabled]="!odoValid()">Save reading</button>
    </div>
  </form>
</div>

<!-- ═══════════════════════════ MAIN CONTENT ═══════════════════════════ -->
<div class="vd-root">

  <!-- Tab bar -->
  <div class="gs-tab-bar">
    <button *ngFor="let t of tabs" class="gs-tab" [class.active]="activeTab() === t.id"
      (click)="activeTab.set(t.id)">{{ t.label }}</button>
  </div>

  <!-- ── OVERVIEW TAB ── -->
  <ng-container *ngIf="activeTab() === 'overview'">

    <!-- HERO -->
    <section class="gs-hero" *ngIf="vehicle()">
      <!-- Ambient spots -->
      <div class="gs-spot" style="top:-100px;right:-120px;width:680px;height:680px;background:var(--accent-glow);opacity:.35;filter:blur(80px)"></div>
      <div class="gs-spot" style="bottom:-180px;left:-120px;width:520px;height:520px;background:oklch(0.55 0.18 250 / 0.35);opacity:.4;filter:blur(90px)"></div>

      <!-- Top tag row -->
      <div class="gs-tag-row">
        <span class="gs-tag" [class.gs-tag--accent]="!vehicle()!.outOfService" [class.gs-tag--parked]="vehicle()!.outOfService">
          {{ vehicle()!.outOfService ? '● Out of service' : '● In service' }}
        </span>
        <span class="gs-tag" *ngIf="vehicle()!.vin">VIN {{ vehicle()!.vin }}</span>
        <span class="gs-tag" *ngIf="vehicle()!.color">{{ vehicle()!.color }}</span>
        <div class="gs-spacer"></div>
        <span class="gs-mono" style="font-size:11px;color:var(--fg-3)">
          Added {{ vehicle()!.createdAt | date:'MMM d, y' }}
        </span>
        <button type="button" class="gs-btn-edit" (click)="toggleService()">
          {{ vehicle()!.outOfService ? 'Return to service' : 'Mark out of service' }}
        </button>
        <a class="gs-btn-edit" [routerLink]="['/vehicles', vehicle()!.id, 'edit']">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit vehicle
        </a>
      </div>

      <!-- Two-col layout -->
      <div class="gs-hero-grid">

        <!-- Left: spec block -->
        <div class="gs-spec-block">
          <!-- Year -->
          <div>
            <div class="gs-mono gs-upper gs-label">Year</div>
            <div class="gs-year">{{ vehicle()!.year }}</div>
          </div>

          <!-- Make wordmark -->
          <div class="gs-make-row">
            <app-make-logo [make]="vehicle()!.make" size="lg" />
            <div>
              <div class="gs-mono gs-upper gs-label">Manufacturer</div>
              <div class="gs-make-name">{{ vehicle()!.make.toUpperCase() }}</div>
            </div>
          </div>

          <!-- Model -->
          <div style="position:relative">
            <div class="gs-spot" style="left:-40px;bottom:-40px;width:420px;height:420px;background:var(--accent-glow);opacity:.45;filter:blur(60px)"></div>
            <div class="gs-mono gs-upper gs-label" style="position:relative">Model</div>
            <div class="gs-model" style="position:relative">{{ vehicle()!.model }}<span *ngIf="vehicle()!.trim" class="gs-trim"> {{ vehicle()!.trim }}</span></div>
          </div>

          <!-- Stat tiles -->
          <div class="gs-stat-row">
            <!-- Odometer tile (clickable) -->
            <div class="gs-stat-tile gs-stat-tile--clickable" (click)="odoOpen.set(true)"
              (mouseenter)="$event.currentTarget.style.borderColor='var(--accent)'"
              (mouseleave)="$event.currentTarget.style.borderColor='var(--border)'">
              <div class="gs-spot" style="left:50%;bottom:-100px;transform:translateX(-50%);width:260px;height:260px;background:var(--accent-glow);opacity:.5;filter:blur(40px)"></div>
              <div class="gs-mono gs-upper gs-tile-label">
                Odometer
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.6"><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M14 6l4 4"/></svg>
              </div>
              <div class="gs-stat-val" style="position:relative">
                {{ currentMiles() | number:'1.0-0' }}
                <span class="gs-mono gs-stat-unit">mi</span>
              </div>
              <!-- Oil sub + progress -->
              <div class="gs-oil-sub" style="position:relative">
                <div style="display:flex;align-items:flex-start;gap:5px">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px"><path d="M14.7 6.3a4 4 0 0 0 5 5L21 12l-9 9-7-7 9-9z"/></svg>
                  <span style="font-size:10.5px;color:var(--fg-2);line-height:1.3;white-space:nowrap">{{ oilSubText() }}</span>
                </div>
                <div class="gs-oil-bar-wrap"
                  [style.border-color]="oilOverdue() ? 'color-mix(in oklch,var(--danger) 50%,transparent)' : 'var(--border)'"
                  [style.background]="oilOverdue() ? 'color-mix(in oklch,var(--danger) 25%,var(--surface-2))' : 'var(--surface-2)'"
                  [style.animation]="oilOverdue() ? 'odoBlink 1.6s ease-in-out infinite' : 'none'">
                  <div class="gs-oil-bar-fill"
                    [style.width]="oilBarPct() + '%'"
                    [style.background]="oilBarColor()"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: photo, or a plain placeholder until images are figured out -->
        <div class="gs-car-col">
          <img *ngIf="vehicle()!.photoUrl" class="gs-vehicle-photo"
            [src]="vehicle()!.photoUrl"
            [alt]="vehicle()!.year + ' ' + vehicle()!.make + ' ' + vehicle()!.model" />
          <div *ngIf="!vehicle()!.photoUrl" class="gs-no-image">No Image Available</div>
          <!-- License plate -->
          <div class="gs-plate" *ngIf="vehicle()!.licensePlate">
            <div class="gs-plate-top">
              <span class="gs-plate-state">ALABAMA</span>
              <div class="gs-plate-sticker">7 / 26</div>
            </div>
            <div class="gs-plate-number">{{ vehicle()!.licensePlate }}</div>
            <div class="gs-plate-slogan">God Bless America</div>
            <span class="gs-bolt" style="top:8px;left:8px"></span>
            <span class="gs-bolt" style="top:8px;right:8px"></span>
            <span class="gs-bolt" style="bottom:8px;left:8px"></span>
            <span class="gs-bolt" style="bottom:8px;right:8px"></span>
          </div>
        </div>
      </div>
    </section>

    <!-- SERVICE HISTORY -->
    <section class="gs-section">
      <div class="gs-section-header">
        <div>
          <div class="gs-kicker gs-upper gs-mono">Log</div>
          <h2 class="gs-section-title">Service History</h2>
          <span style="font-size:12.5px;color:var(--fg-3)">
            {{ maintenanceLogs().length }} entries
          </span>
        </div>
        <div class="gs-spacer"></div>
        <a class="gs-btn-primary" [routerLink]="['/maintenance/new']"
          [queryParams]="{vehicleId: vehicle()?.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Add entry
        </a>
      </div>

      <!-- Filter chips -->
      <div class="gs-filter-row">
        <button *ngFor="let f of serviceFilters" class="gs-filter-chip"
          [class.active]="serviceFilter() === f" (click)="serviceFilter.set(f)">{{ f }}</button>
      </div>

      <!-- Cards grid -->
      <div class="gs-cards-grid">
        <div *ngFor="let log of filteredLogs()" class="gs-service-card"
          (mouseenter)="$event.currentTarget.style.borderColor='var(--border-strong)'"
          (mouseleave)="$event.currentTarget.style.borderColor='var(--border)'">
          <div class="gs-card-stripe" [style.background]="tagColor(log.type)" [style.box-shadow]="'0 0 12px '+tagColor(log.type)"></div>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="gs-mono gs-upper" style="font-size:10px;letter-spacing:.18em;color:var(--fg-3)">{{ log.date | date:'MMM d, y' }}</span>
            <span class="gs-dot"></span>
            <span class="gs-mono" style="font-size:11px;color:var(--fg-3)">{{ log.mileage | number:'1.0-0' }} mi</span>
            <div class="gs-spacer"></div>
            <span class="gs-tag-pill" [style.color]="tagColor(log.type)"
              [style.background]="'color-mix(in oklch,'+tagColor(log.type)+' 18%,transparent)'"
              [style.border]="'1px solid color-mix(in oklch,'+tagColor(log.type)+' 35%,transparent)'">
              {{ log.type }}
            </span>
          </div>
          <div style="font-size:16px;font-weight:700;letter-spacing:-.01em">{{ log.type }}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <span style="font-size:12.5px;color:var(--fg-2)">{{ log.shop ?? '—' }}</span>
            <span class="gs-mono" style="font-size:14px;font-weight:700">{{ log.cost ? ('$' + (log.cost | number:'1.2-2')) : '—' }}</span>
          </div>
          <div *ngIf="log.description" style="display:flex;flex-wrap:wrap;gap:6px;padding-top:8px;border-top:1px dashed var(--border)">
            <span class="gs-mono gs-part-chip">{{ log.description }}</span>
          </div>
        </div>
        <div *ngIf="filteredLogs().length === 0" style="grid-column:1/-1;padding:32px;text-align:center;color:var(--fg-3);font-size:13px">
          No entries match this filter.
        </div>
      </div>
    </section>

    <!-- COST OF MAINTENANCE -->
    <section class="gs-section" *ngIf="maintenanceLogs().length > 0">
      <div class="gs-section-header">
        <div>
          <div class="gs-kicker gs-upper gs-mono">Spend</div>
          <h2 class="gs-section-title">Cost of Maintenance</h2>
          <span style="font-size:12.5px;color:var(--fg-3)">All time</span>
        </div>
      </div>

      <!-- Stat tiles -->
      <div class="gs-cost-stats">
        <div class="gs-big-stat">
          <div class="gs-spot" style="left:50%;bottom:-120px;transform:translateX(-50%);width:320px;height:320px;background:var(--accent-glow);opacity:.45;filter:blur(50px)"></div>
          <span class="gs-mono gs-upper" style="font-size:10px;letter-spacing:.18em;color:var(--fg-3);position:relative">Total spend</span>
          <div style="margin-top:8px;font-size:28px;font-weight:800;letter-spacing:-.02em;position:relative">\${{ totalCost() | number:'1.2-2' }}</div>
          <span style="font-size:11.5px;color:var(--fg-3);position:relative">all time</span>
        </div>
        <div class="gs-big-stat">
          <span class="gs-mono gs-upper" style="font-size:10px;letter-spacing:.18em;color:var(--fg-3)">Avg / service</span>
          <div style="margin-top:8px;font-size:28px;font-weight:800;letter-spacing:-.02em">\${{ avgPerService() | number:'1.2-2' }}</div>
          <span style="font-size:11.5px;color:var(--fg-3)">{{ maintenanceLogs().length }} services</span>
        </div>
        <div class="gs-big-stat">
          <span class="gs-mono gs-upper" style="font-size:10px;letter-spacing:.18em;color:var(--fg-3)">This year</span>
          <div style="margin-top:8px;font-size:28px;font-weight:800;letter-spacing:-.02em">\${{ ytdCost() | number:'1.2-2' }}</div>
          <span style="font-size:11.5px;color:var(--fg-3)">{{ currentYear }}</span>
        </div>
      </div>

      <!-- Bar chart -->
      <div class="gs-chart-card">
        <div class="gs-spot" style="left:30%;bottom:-200px;width:620px;height:620px;background:var(--accent-glow);opacity:.18;filter:blur(80px)"></div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;position:relative">
          <span class="gs-mono gs-upper" style="font-size:10px;letter-spacing:.18em;color:var(--fg-3)">Monthly spend · USD (last 12 mo)</span>
        </div>
        <div class="gs-bar-chart" style="position:relative">
          <div *ngFor="let d of monthlyData(); let i = index"
            class="gs-bar-col"
            (mouseenter)="hoveredBar.set(i)"
            (mouseleave)="hoveredBar.set(-1)">
            <div style="position:relative;width:100%;height:100%;display:flex;align-items:flex-end;justify-content:center">
              <div *ngIf="hoveredBar() === i && d.v > 0"
                class="gs-mono gs-bar-tooltip"
                [style.bottom]="barHeight(d.v) + 8 + '%'">
                \${{ d.v | number:'1.0-0' }}
              </div>
              <div class="gs-bar"
                [style.height]="Math.max(barHeight(d.v), 2) + '%'"
                [style.background]="d.v > 0 ? 'linear-gradient(180deg,var(--accent) 0%,color-mix(in oklch,var(--accent) 50%,transparent) 100%)' : 'var(--surface-2)'"
                [style.border]="d.v > 0 ? 'none' : '1px dashed var(--border)'"
                [style.box-shadow]="d.v > 0 && hoveredBar() === i ? '0 0 24px var(--accent-glow),0 -2px 0 var(--accent)' : d.v > 0 ? '0 0 12px color-mix(in oklch,var(--accent) 30%,transparent)' : 'none'">
              </div>
            </div>
            <span class="gs-mono gs-upper gs-bar-label">{{ d.m }}</span>
          </div>
        </div>
      </div>

      <!-- Category breakdown -->
      <div class="gs-cost-breakdown">
        <div class="gs-breakdown-card">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px">
            <span class="gs-mono gs-upper" style="font-size:10px;letter-spacing:.18em;color:var(--fg-3)">By category</span>
            <span class="gs-mono" style="font-size:11px;color:var(--fg-3)">\${{ totalCost() | number:'1.2-2' }}</span>
          </div>
          <div class="gs-stacked-bar">
            <div *ngFor="let c of costByCategory()"
              [style.width]="(c.v / totalCost() * 100) + '%'"
              [style.background]="c.color"
              [title]="c.label + ': $' + c.v.toFixed(2)">
            </div>
          </div>
          <div class="gs-category-rows">
            <div *ngFor="let c of costByCategory()" class="gs-category-row">
              <span class="gs-cat-dot" [style.background]="c.color" [style.box-shadow]="'0 0 8px '+c.color"></span>
              <span style="flex:1;color:var(--fg-2)">{{ c.label }}</span>
              <span class="gs-mono" style="color:var(--fg-3)">{{ (c.v / totalCost() * 100).toFixed(0) }}%</span>
              <span class="gs-mono" style="color:var(--fg);font-weight:600;min-width:56px;text-align:right">\${{ c.v | number:'1.2-2' }}</span>
            </div>
          </div>
        </div>
        <!-- Insights -->
        <div class="gs-insights-card">
          <span class="gs-mono gs-upper" style="font-size:10px;letter-spacing:.18em;color:var(--fg-3)">Sage insights</span>
          <div *ngFor="let ins of insights()" class="gs-insight">
            <span class="gs-insight-dot" [style.background]="ins.color" [style.box-shadow]="'0 0 10px '+ins.color"></span>
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--fg);margin-bottom:3px">{{ ins.title }}</div>
              <div style="font-size:12px;color:var(--fg-3);line-height:1.5">{{ ins.body }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

  </ng-container>

  <!-- ── SERVICE PARTS TAB ── -->
  <ng-container *ngIf="activeTab() === 'parts'">
    <div class="gs-parts-grid">

      <!-- Oil card -->
      <div class="gs-spec-card">
        <div class="gs-spot" style="left:60%;top:-120px;width:320px;height:320px;background:var(--accent-glow);opacity:.18;filter:blur(60px)"></div>
        <div class="gs-spec-card-header">
          <span class="gs-kicker gs-upper gs-mono">Lubrication</span>
          <h3 class="gs-spec-title">Engine Oil</h3>
        </div>
        <div class="gs-spec-rows">
          <div class="gs-spec-row"><span class="gs-mono gs-upper gs-spec-key">Type</span><span>{{ parts().oil.type }}</span></div>
          <div class="gs-spec-row"><span class="gs-mono gs-upper gs-spec-key">Capacity</span><span>{{ parts().oil.capacity }}</span></div>
          <div class="gs-spec-row"><span class="gs-mono gs-upper gs-spec-key">Filter (WIX)</span><span class="gs-mono">{{ parts().oil.filterPart }}</span></div>
          <div class="gs-spec-row"><span class="gs-mono gs-upper gs-spec-key">Drain plug</span><span>{{ parts().oil.drainPlug }}</span></div>
          <div class="gs-spec-row"><span class="gs-mono gs-upper gs-spec-key">Interval</span><span>{{ parts().oil.interval }}</span></div>
        </div>
      </div>

      <!-- Spark Plugs card -->
      <div class="gs-spec-card">
        <div class="gs-spot" style="left:60%;top:-120px;width:320px;height:320px;background:var(--accent-glow);opacity:.18;filter:blur(60px)"></div>
        <div class="gs-spec-card-header">
          <span class="gs-kicker gs-upper gs-mono">Ignition</span>
          <h3 class="gs-spec-title">Spark Plugs</h3>
        </div>
        <div class="gs-spec-rows">
          <div class="gs-spec-row"><span class="gs-mono gs-upper gs-spec-key">Plug P/N</span><span class="gs-mono">{{ parts().spark.plug }}</span></div>
          <div class="gs-spec-row"><span class="gs-mono gs-upper gs-spec-key">Gap</span><span>{{ parts().spark.gap }}</span></div>
          <div class="gs-spec-row"><span class="gs-mono gs-upper gs-spec-key">Torque</span><span>{{ parts().spark.torque }}</span></div>
          <div class="gs-spec-row"><span class="gs-mono gs-upper gs-spec-key">Socket size</span><span>{{ parts().spark.socket }}</span></div>
          <div class="gs-spec-row"><span class="gs-mono gs-upper gs-spec-key">Interval</span><span>{{ parts().spark.interval }}</span></div>
        </div>
      </div>

      <!-- Tires card -->
      <div class="gs-spec-card">
        <div class="gs-spec-card-header">
          <span class="gs-kicker gs-upper gs-mono">Wheels</span>
          <h3 class="gs-spec-title">Tires</h3>
        </div>
        <div class="gs-spec-rows">
          <div class="gs-spec-row"><span class="gs-mono gs-upper gs-spec-key">Front size</span><span class="gs-mono">{{ parts().tires.front }}</span></div>
          <div class="gs-spec-row"><span class="gs-mono gs-upper gs-spec-key">Rear size</span><span class="gs-mono">{{ parts().tires.rear }}</span></div>
          <div class="gs-spec-row"><span class="gs-mono gs-upper gs-spec-key">Pressure</span><span>{{ parts().tires.pressure }}</span></div>
          <div class="gs-spec-row"><span class="gs-mono gs-upper gs-spec-key">Lug torque</span><span>{{ parts().tires.lugTorque }}</span></div>
          <div class="gs-spec-row"><span class="gs-mono gs-upper gs-spec-key">Rotation</span><span>{{ parts().tires.rotation }}</span></div>
        </div>
      </div>

      <!-- Filters table -->
      <div class="gs-spec-card gs-spec-card--wide">
        <div class="gs-spec-card-header">
          <span class="gs-kicker gs-upper gs-mono">Replaceables</span>
          <h3 class="gs-spec-title">Filters · WIX</h3>
        </div>
        <div class="gs-filter-table">
          <div class="gs-filter-header">Filter</div>
          <div class="gs-filter-header gs-mono">WIX P/N</div>
          <div class="gs-filter-header">Notes</div>
          <ng-container *ngFor="let f of parts().filters">
            <div class="gs-filter-cell" style="font-weight:600">{{ f.name }}</div>
            <div class="gs-filter-cell gs-mono" style="color:var(--accent)">{{ f.part }}</div>
            <div class="gs-filter-cell" style="color:var(--fg-2)">{{ f.notes }}</div>
          </ng-container>
        </div>
      </div>

      <!-- Service notes -->
      <div class="gs-spec-card gs-spec-card--wide">
        <div class="gs-spec-card-header">
          <span class="gs-kicker gs-upper gs-mono">Tips &amp; gotchas</span>
          <h3 class="gs-spec-title">Service Notes</h3>
        </div>
        <ul class="gs-notes-list">
          <li *ngFor="let n of parts().notes; let i = index" class="gs-note-item">
            <span class="gs-mono gs-note-num">{{ (i+1).toString().padStart(2,'0') }}</span>
            <span style="font-size:13px;color:var(--fg-2);line-height:1.55">{{ n }}</span>
          </li>
        </ul>
      </div>

    </div>
  </ng-container>

  <!-- ── BODY TAB ── -->
  <ng-container *ngIf="activeTab() === 'body'">
    <div class="gs-body-placeholder">
      <div class="gs-spot" style="left:50%;top:30%;transform:translateX(-50%);width:520px;height:520px;background:var(--accent-glow);opacity:.18;filter:blur(80px)"></div>
      <div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px;position:relative">
        <div class="gs-body-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 13l2-5a3 3 0 0 1 3-2h8a3 3 0 0 1 3 2l2 5v5h-3v-2H6v2H3z"/>
            <circle cx="7.5" cy="15.5" r="1.4" fill="var(--accent)"/>
            <circle cx="16.5" cy="15.5" r="1.4" fill="var(--accent)"/>
          </svg>
        </div>
        <span class="gs-kicker gs-upper gs-mono">Body</span>
        <h3 style="margin:0;font-size:22px;font-weight:800;letter-spacing:-.01em">Coming soon</h3>
        <p style="margin:0;font-size:13px;color:var(--fg-3);max-width:360px;line-height:1.5">
          Paint codes, panel measurements, and trim part numbers will live here.
        </p>
      </div>
    </div>
  </ng-container>

</div>
  `,
  styles: [`
    /* Root wrapper */
    .vd-root {
      font-family: 'Archivo', system-ui, sans-serif;
      color: var(--fg);
      padding: 32px 36px 80px;
      max-width: 1320px;
      width: 100%;
      margin: 0 auto;
    }

    /* Shared helpers */
    .gs-spot { position: absolute; border-radius: 50%; pointer-events: none; }
    .gs-spacer { flex: 1; }
    .gs-dot { width: 3px; height: 3px; border-radius: 999px; background: var(--fg-3); }
    .gs-kicker { font-size: 10px; letter-spacing: .22em; color: var(--accent); margin-bottom: 4px; display: block; }
    .gs-label { font-size: 10px; letter-spacing: .22em; color: var(--fg-3); margin-bottom: 4px; }
    .gs-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
    .gs-upper { text-transform: uppercase; letter-spacing: .08em; }

    /* Tab bar */
    .gs-tab-bar {
      display: flex; align-items: center; gap: 4px; padding: 4px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
      width: fit-content; margin-bottom: 24px;
    }
    .gs-tab {
      padding: 10px 18px; border-radius: 9px; border: none;
      background: transparent; color: var(--fg-3);
      font-size: 13.5px; font-weight: 700; cursor: pointer; letter-spacing: -.005em;
      font-family: 'Archivo', system-ui, sans-serif;
      transition: background 160ms, color 160ms;
    }
    .gs-tab.active {
      background: var(--surface-2); color: var(--fg);
      box-shadow: inset 0 0 0 1px var(--border-strong), 0 0 18px var(--accent-glow);
    }

    /* Hero */
    .gs-hero {
      position: relative; border-radius: 20px;
      border: 1px solid var(--border);
      background: linear-gradient(180deg, var(--surface) 0%, var(--bg-2) 100%);
      padding: 32px 36px 36px; overflow: hidden;
    }
    .gs-tag-row { position: relative; display: flex; align-items: center; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
    .gs-tag {
      padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border);
      font-size: 10.5px; font-weight: 600; color: var(--fg-2);
      background: var(--surface-2); white-space: nowrap;
    }
    .gs-tag--accent { color: var(--accent); border-color: color-mix(in oklch, var(--accent) 35%, transparent); background: color-mix(in oklch, var(--accent) 12%, transparent); }
    .gs-tag--parked { color: var(--fg-3); border-color: var(--border); background: var(--surface-2); }

    /* Hero grid */
    .gs-hero-grid { position: relative; display: grid; grid-template-columns: 1fr 1.15fr; gap: 32px; align-items: center; }
    .gs-spec-block { display: flex; flex-direction: column; gap: 28px; }

    /* Year */
    .gs-year {
      margin-top: 4px; font-size: 64px; font-weight: 900; line-height: .95; letter-spacing: -.04em;
      font-feature-settings: "tnum";
      background: linear-gradient(180deg, var(--fg) 0%, var(--fg-2) 100%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }

    /* Make */
    .gs-make-row { display: flex; align-items: center; gap: 14px; }
    .gs-make-name { font-size: 36px; font-weight: 700; letter-spacing: -.01em; }

    /* Model */
    .gs-model {
      font-size: 72px; font-weight: 900; line-height: .9; letter-spacing: -.04em;
      color: var(--fg); text-shadow: 0 0 60px var(--accent-glow);
    }
    .gs-trim {
      margin-left: 0.15em; font-size: 0.38em; font-weight: 700;
      letter-spacing: .04em; color: var(--accent); vertical-align: baseline;
    }

    /* Stat tiles */
    .gs-stat-row { display: flex; gap: 14px; flex-wrap: wrap; }
    .gs-stat-tile {
      position: relative; padding: 14px 18px; border-radius: 12px;
      background: var(--surface); border: 1px solid var(--border);
      overflow: hidden; display: inline-flex; flex-direction: column; min-width: 0;
    }
    .gs-stat-tile--clickable { cursor: pointer; transition: border-color 160ms; }
    .gs-tile-label {
      font-size: 9.5px; letter-spacing: .18em; color: var(--fg-3);
      position: relative; display: flex; align-items: center; gap: 6px;
    }
    .gs-stat-val { margin-top: 6px; font-size: 26px; font-weight: 800; letter-spacing: -.02em; position: relative; display: flex; align-items: baseline; gap: 6px; }
    .gs-stat-unit { font-size: 11px; color: var(--fg-3); }

    /* Oil */
    .gs-oil-sub { margin-top: 8px; position: relative; }
    .gs-oil-bar-wrap {
      margin-top: 6px; height: 2px; border-radius: 2px;
      overflow: hidden; border-width: 1px; border-style: solid;
    }
    .gs-oil-bar-fill { height: 100%; border-radius: 2px; transition: width 600ms ease; }

    /* Photo / placeholder column */
    .gs-car-col {
      position: relative; min-height: 280px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 28px;
    }
    .gs-no-image {
      margin: 0; max-width: 320px;
      font-size: 48px; font-weight: 800; line-height: 0.95;
      letter-spacing: -0.04em; text-align: center; color: var(--fg-3);
    }
    .gs-vehicle-photo {
      width: 100%; max-width: 460px; max-height: 320px;
      object-fit: contain; border-radius: 12px;
    }

    /* License plate */
    .gs-plate {
      position: relative;
      width: 192px; height: 88px; border-radius: 8px; z-index: 3;
      background: linear-gradient(180deg, oklch(0.96 0.01 90) 0%, oklch(0.88 0.015 90) 100%);
      border: 2px solid oklch(0.4 0.02 260);
      box-shadow: 0 8px 24px oklch(0 0 0 / .5), inset 0 0 0 1px oklch(1 0 0 / .6), inset 0 -2px 6px oklch(0 0 0 / .15);
      padding: 6px 11px 8px;
      display: flex; flex-direction: column; overflow: hidden;
    }
    .gs-plate-top { display: flex; align-items: center; justify-content: space-between; }
    .gs-plate-state {
      font-family: 'Stardos Stencil', 'Archivo', sans-serif;
      font-size: 10.5px; font-weight: 700; letter-spacing: .14em;
      color: oklch(0.35 0.15 25); text-transform: uppercase; padding: 0 8px 0 40px;
    }
    .gs-plate-sticker {
      min-width: 29px; height: 16px; padding: 0 4px; border-radius: 2.5px;
      background: linear-gradient(180deg, oklch(0.7 0.18 25), oklch(0.55 0.2 25));
      display: grid; place-items: center;
      color: white; font-family: 'Archivo', sans-serif;
      font-size: 8px; font-weight: 700; letter-spacing: .04em; white-space: nowrap;
      box-shadow: inset 0 0 0 1px oklch(1 0 0 / .3);
    }
    .gs-plate-number {
      flex: 1; display: grid; place-items: center; margin-top: 2px;
      font-size: 28px; font-weight: 400; letter-spacing: .06em;
      color: oklch(0.28 0.06 260); white-space: nowrap;
      font-family: 'Bowlby One', 'Archivo', sans-serif;
      text-shadow: 0 1px 0 oklch(1 0 0 / .55), 0 -1px 0 oklch(0 0 0 / .18), 0 2px 2px oklch(0 0 0 / .15);
    }
    .gs-plate-slogan {
      display: flex; justify-content: center;
      font-family: 'Stardos Stencil', sans-serif;
      font-size: 7.5px; font-weight: 700; letter-spacing: .14em;
      color: oklch(0.4 0.02 260); text-transform: uppercase;
    }
    .gs-bolt {
      position: absolute; width: 5px; height: 5px; border-radius: 999px;
      background: radial-gradient(circle at 30% 30%, oklch(0.6 0.01 260), oklch(0.25 0.01 260));
      box-shadow: 0 0 0 1px oklch(0 0 0 / .2);
    }

    /* Section */
    .gs-section { position: relative; padding: 28px 4px 8px; border-top: 1px solid var(--border); margin-top: 36px; }
    .gs-section-header { display: flex; align-items: flex-end; gap: 16px; margin-bottom: 18px; padding: 0 4px; }
    .gs-section-title { margin: 0; font-size: 30px; font-weight: 800; letter-spacing: -.02em; }

    /* Filter row */
    .gs-filter-row { display: flex; gap: 6px; padding: 0 4px 16px; flex-wrap: wrap; }
    .gs-filter-chip {
      padding: 6px 12px; border-radius: 999px;
      background: transparent; color: var(--fg-2);
      border: 1px solid var(--border); font-size: 12px; font-weight: 600; cursor: pointer;
      font-family: 'Archivo', system-ui, sans-serif;
    }
    .gs-filter-chip.active { background: var(--fg); color: var(--bg); border-color: var(--fg); }

    /* Service cards */
    .gs-cards-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .gs-service-card {
      position: relative; padding: 16px 18px; border-radius: 14px;
      background: var(--surface); border: 1px solid var(--border);
      display: flex; flex-direction: column; gap: 10px;
      cursor: pointer; transition: border-color 200ms;
    }
    .gs-card-stripe { position: absolute; left: 0; top: 16px; bottom: 16px; width: 3px; border-radius: 2px; opacity: .7; }
    .gs-tag-pill { font-size: 9.5px; padding: 2px 7px; border-radius: 4px; font-weight: 600; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: .12em; }
    .gs-part-chip { font-size: 10.5px; padding: 3px 7px; border-radius: 5px; background: var(--surface-2); color: var(--fg-3); }

    /* Button */
    .gs-btn-primary {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 9px 14px; border-radius: 9px;
      background: var(--accent); color: black;
      border: none; cursor: pointer; text-decoration: none;
      font-size: 13px; font-weight: 700; font-family: 'Archivo', system-ui, sans-serif;
      box-shadow: 0 0 24px var(--accent-glow);
    }
    .gs-btn-edit {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 7px 13px; border-radius: 9px;
      background: var(--surface-2); color: var(--fg-2);
      border: 1px solid var(--border-strong); cursor: pointer; text-decoration: none;
      font-size: 12.5px; font-weight: 600; font-family: 'Archivo', system-ui, sans-serif;
      transition: background 160ms, color 160ms, border-color 160ms;
      position: relative;
    }
    .gs-btn-edit:hover { background: var(--surface); color: var(--fg); border-color: var(--accent); }

    /* Cost stats */
    .gs-cost-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 22px; }
    .gs-big-stat { position: relative; padding: 18px 20px; border-radius: 14px; background: var(--surface); border: 1px solid var(--border); overflow: hidden; display: flex; flex-direction: column; }

    /* Bar chart */
    .gs-chart-card { position: relative; padding: 22px 24px 18px; border-radius: 14px; background: var(--surface); border: 1px solid var(--border); margin-bottom: 14px; overflow: hidden; }
    .gs-bar-chart { display: flex; gap: 10px; align-items: flex-end; height: 180px; position: relative; }
    .gs-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end; }
    .gs-bar { width: 100%; max-width: 36px; border-radius: 6px 6px 2px 2px; transition: box-shadow 180ms; }
    .gs-bar-label { font-size: 9.5px; letter-spacing: .12em; color: var(--fg-3); }
    .gs-bar-tooltip { position: absolute; font-size: 11px; font-weight: 700; padding: 3px 7px; border-radius: 5px; background: var(--fg); color: var(--bg); white-space: nowrap; }

    /* Breakdown */
    .gs-cost-breakdown { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .gs-breakdown-card { padding: 18px 20px; border-radius: 14px; background: var(--surface); border: 1px solid var(--border); }
    .gs-stacked-bar { display: flex; height: 12px; border-radius: 6px; overflow: hidden; margin-bottom: 14px; border: 1px solid var(--border); }
    .gs-category-rows { display: flex; flex-direction: column; gap: 8px; }
    .gs-category-row { display: flex; align-items: center; gap: 10px; font-size: 12.5px; }
    .gs-cat-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
    .gs-insights-card { padding: 18px 20px; border-radius: 14px; background: var(--surface); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 12px; }
    .gs-insight { padding: 12px 14px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); display: flex; gap: 12px; align-items: flex-start; }
    .gs-insight-dot { width: 8px; height: 8px; border-radius: 999px; margin-top: 5px; flex-shrink: 0; }

    /* Spec cards (Service Parts tab) */
    .gs-parts-grid { display: flex; flex-direction: column; gap: 24px; }
    .gs-parts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .gs-spec-card {
      position: relative; padding: 20px 22px; border-radius: 16px;
      background: var(--surface); border: 1px solid var(--border); overflow: hidden;
      display: flex; flex-direction: column; gap: 14px;
    }
    .gs-spec-card--wide { width: 100%; }
    .gs-spec-card-header { display: flex; align-items: baseline; gap: 10px; position: relative; }
    .gs-spec-title { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -.01em; }
    .gs-spec-rows { position: relative; display: flex; flex-direction: column; gap: 2px; }
    .gs-spec-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 9px 0; border-bottom: 1px dashed var(--border); font-size: 13.5px; font-weight: 600; }
    .gs-spec-key { font-size: 10px; letter-spacing: .14em; color: var(--fg-3); }

    /* Filter table */
    .gs-filter-table { display: grid; grid-template-columns: 1.2fr 1fr 2fr; }
    .gs-filter-header { font-size: 9.5px; letter-spacing: .16em; color: var(--fg-3); padding: 8px 14px; border-bottom: 1px solid var(--border-strong); font-family: 'JetBrains Mono', monospace; text-transform: uppercase; }
    .gs-filter-cell { font-size: 13px; padding: 12px 14px; border-bottom: 1px solid var(--border); font-weight: 500; }

    /* Notes */
    .gs-notes-list { margin: 4px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
    .gs-note-item { display: flex; gap: 12px; align-items: flex-start; padding: 10px 12px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); }
    .gs-note-num { font-size: 10.5px; color: var(--accent); font-weight: 700; min-width: 24px; }

    /* Body placeholder */
    .gs-body-placeholder {
      position: relative; min-height: 420px; border-radius: 16px;
      background: var(--surface); border: 1px dashed var(--border-strong);
      display: grid; place-items: center; overflow: hidden;
    }
    .gs-body-icon {
      width: 56px; height: 56px; border-radius: 14px;
      background: var(--surface-2); border: 1px solid var(--border-strong);
      display: grid; place-items: center; margin-bottom: 8px;
    }

    /* Odometer dialog */
    .gs-overlay {
      position: fixed; inset: 0; z-index: 100;
      background: oklch(0 0 0 / .55); backdrop-filter: blur(6px);
      display: grid; place-items: center; padding: 16px;
      animation: fadeIn 160ms ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .gs-dialog {
      width: min(420px, 100%);
      background: var(--surface); border: 1px solid var(--border-strong);
      border-radius: 16px; padding: 22px 24px 20px;
      box-shadow: 0 24px 64px oklch(0 0 0 / .5), 0 0 80px var(--accent-glow);
      position: relative; overflow: hidden;
    }
    .gs-dialog-spot {
      position: absolute; top: -160px; left: 30%;
      width: 420px; height: 420px; border-radius: 50%;
      background: var(--accent-glow); opacity: .25; filter: blur(70px); pointer-events: none;
    }
    .gs-dialog-title { margin: 4px 0 4px; font-size: 22px; font-weight: 800; letter-spacing: -.01em; position: relative; }
    .gs-dialog-sub { margin: 0 0 18px; font-size: 12.5px; color: var(--fg-3); position: relative; }
    .gs-dialog-label { position: relative; display: flex; flex-direction: column; gap: 6px; }
    .gs-dialog-input-wrap {
      display: flex; align-items: baseline; gap: 8px; padding: 12px 14px; border-radius: 10px;
      background: var(--surface-2); border: 1px solid var(--border-strong);
    }
    .gs-dialog-input-wrap.error { border-color: var(--danger); }
    .gs-odo-input {
      flex: 1; min-width: 0; background: transparent; border: none; outline: none;
      color: var(--fg); font-size: 28px; font-weight: 800; letter-spacing: -.01em;
      font-family: 'JetBrains Mono', monospace;
    }
    .gs-dialog-hint { min-height: 18px; margin-top: 8px; font-size: 12px; color: var(--fg-3); position: relative; }
    .gs-dialog-hint.danger { color: var(--danger); }
    .gs-dialog-actions { display: flex; gap: 8px; margin-top: 14px; position: relative; }
    .gs-btn-ghost {
      flex: 1; padding: 11px 14px; border-radius: 9px;
      background: transparent; border: 1px solid var(--border);
      color: var(--fg-2); font-size: 13px; font-weight: 600; cursor: pointer;
      font-family: 'Archivo', system-ui, sans-serif;
    }
    .gs-btn-primary[disabled] { background: var(--surface-2); color: var(--fg-3); box-shadow: none; cursor: not-allowed; }

    /* Parts grid two-col */
    .gs-parts-grid > div:not(.gs-spec-card--wide) { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .gs-parts-grid > .gs-spec-card { display: flex; flex-direction: column; gap: 14px; }
  `],
})
export class VehicleDetailComponent implements OnInit {
  readonly Math = Math;
  readonly tagColor = tagColor;
  readonly currentYear = new Date().getFullYear();
  readonly serviceFilters = ['All', 'Oil Change', 'Brakes', 'Engine', 'Tires', 'Drivetrain', 'Inspection', 'Other'];

  readonly tabs = [
    { id: 'overview',  label: 'Overview' },
    { id: 'parts',     label: 'Service Parts' },
    { id: 'body',      label: 'Body' },
  ];

  vehicle         = signal<Vehicle | null>(null);
  readonly parts  = computed(() => buildParts(this.vehicle()?.specs));
  maintenanceLogs = signal<any[]>([]);
  activeTab       = signal('overview');
  serviceFilter   = signal('All');
  odoOpen         = signal(false);
  hoveredBar      = signal(-1);
  odoValue        = signal('');
  odoError        = signal('');

  // Odometer state: tracks current reading + last oil change reading
  currentMiles    = signal(0);
  lastOilOdo      = signal(0);
  readonly OIL_INTERVAL = 3000;

  // ── Computed ────────────────────────────────────
  readonly filteredLogs = computed(() => {
    const f = this.serviceFilter();
    const logs = this.maintenanceLogs();
    return f === 'All' ? logs : logs.filter(l => l.type === f);
  });

  readonly oilMilesSince = computed(() => this.currentMiles() - this.lastOilOdo());
  readonly oilRemaining  = computed(() => Math.max(0, this.OIL_INTERVAL - this.oilMilesSince()));
  readonly oilOverdue    = computed(() => this.oilMilesSince() >= this.OIL_INTERVAL);
  readonly oilSubText    = computed(() =>
    this.oilOverdue()
      ? `Oil change overdue by ${(this.oilMilesSince() - this.OIL_INTERVAL).toLocaleString()} mi`
      : `Oil due in ${this.oilRemaining().toLocaleString()} mi`
  );
  readonly oilBarPct     = computed(() => {
    if (this.oilOverdue()) return 100;
    return Math.min(100, (this.oilRemaining() / this.OIL_INTERVAL) * 100);
  });
  readonly oilBarColor   = computed(() => {
    const r = this.oilRemaining();
    const pct = r / this.OIL_INTERVAL;
    if (this.oilOverdue()) return 'var(--danger)';
    if (pct > 0.5) return 'var(--good)';
    if (pct > 0.2) return 'var(--accent)';
    return 'var(--danger)';
  });

  readonly odoValid = computed(() => {
    const n = Number(this.odoValue().replace(/[^0-9]/g, ''));
    return Number.isFinite(n) && n >= this.currentMiles();
  });
  readonly odoDeltaHint = computed(() => {
    const n = Number(this.odoValue().replace(/[^0-9]/g, ''));
    if (!Number.isFinite(n)) return '';
    const d = n - this.currentMiles();
    if (d === 0) return 'No change';
    if (d > 0)   return `+${d.toLocaleString()} mi since last entry`;
    return '';
  });

  readonly totalCost     = computed(() => this.maintenanceLogs().reduce((s, l) => s + (l.cost ?? 0), 0));
  readonly avgPerService = computed(() => this.maintenanceLogs().length ? this.totalCost() / this.maintenanceLogs().length : 0);
  readonly ytdCost       = computed(() => {
    const yr = this.currentYear;
    return this.maintenanceLogs()
      .filter(l => new Date(l.date).getFullYear() === yr)
      .reduce((s, l) => s + (l.cost ?? 0), 0);
  });
  readonly monthlyData = computed(() => {
    const now    = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ m: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), v: 0 });
    }
    for (const log of this.maintenanceLogs()) {
      const d = new Date(log.date);
      const entry = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
      if (entry) entry.v += log.cost ?? 0;
    }
    return months;
  });

  readonly chartMax     = computed(() => Math.max(...this.monthlyData().map(d => d.v), 1));
  readonly barHeight    = (v: number) => this.chartMax() ? (v / this.chartMax()) * 100 * 0.85 : 0;

  readonly costByCategory = computed(() => {
    const map: Record<string, number> = {};
    for (const l of this.maintenanceLogs()) {
      map[l.type] = (map[l.type] ?? 0) + (l.cost ?? 0);
    }
    const colors = [
      'oklch(0.82 0.14 75)', 'oklch(0.7 0.18 25)', 'oklch(0.78 0.14 150)',
      'oklch(0.72 0.14 220)', 'oklch(0.78 0.10 300)', 'oklch(0.72 0.14 160)',
    ];
    return Object.entries(map).map(([label, v], i) => ({ label, v, color: colors[i % colors.length] }))
      .sort((a, b) => b.v - a.v);
  });

  readonly insights = computed(() => {
    const cats = this.costByCategory();
    const top   = cats[0];
    const logs  = this.maintenanceLogs();
    const res   = [];
    if (top && this.totalCost() > 0)
      res.push({ color: 'var(--accent)', title: `${top.label} is your top maintenance spend`, body: `$${top.v.toFixed(2)} total — ${(top.v / this.totalCost() * 100).toFixed(0)}% of all maintenance costs.` });
    if (logs.length > 0)
      res.push({ color: 'var(--good)', title: `${logs.length} service${logs.length > 1 ? 's' : ''} logged`, body: `Average cost per service: $${this.avgPerService().toFixed(2)}.` });
    res.push({ color: 'var(--fg-2)', title: this.oilSubText(), body: `Oil change interval: ${this.OIL_INTERVAL.toLocaleString()} mi.` });
    return res;
  });

  constructor(
    private readonly svc:   VehicleService,
    private readonly http:  HttpClient,
    private readonly route: ActivatedRoute,
  ) {}

  toggleService() {
    const v = this.vehicle();
    if (!v) return;
    this.svc.update(v.id, { outOfService: !v.outOfService }).subscribe(updated => {
      this.vehicle.set({ ...v, ...updated });
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;

    this.svc.getOne(id).subscribe(v => {
      this.vehicle.set(v);
      this.currentMiles.set(v.currentMileage);
      // Estimate last oil change from maintenance logs (filled after logs load)
      this.lastOilOdo.set(Math.max(0, v.currentMileage - Math.floor(this.OIL_INTERVAL * 0.57)));
    });

    this.http.get<any[]>(`/api/maintenance/vehicle/${id}`).subscribe(logs => {
      this.maintenanceLogs.set([...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      // Find most recent oil change to set last oil odo
      const oilLog = logs.filter(l => l.type?.toLowerCase().includes('oil') && l.mileage)
        .sort((a, b) => b.mileage - a.mileage)[0];
      if (oilLog) this.lastOilOdo.set(oilLog.mileage);
    });
  }

  submitOdo() {
    const n = Number(this.odoValue().replace(/[^0-9]/g, ''));
    if (!Number.isFinite(n) || n < this.currentMiles()) {
      this.odoError.set(`Reading must be ≥ current (${this.currentMiles().toLocaleString()} mi).`);
      return;
    }
    // Update vehicle mileage on server
    const v = this.vehicle();
    if (v) {
      this.http.put(`/api/vehicles/${v.id}`, { ...v, currentMileage: n }).subscribe();
    }
    this.currentMiles.set(n);
    this.odoOpen.set(false);
    this.odoValue.set('');
  }
}
