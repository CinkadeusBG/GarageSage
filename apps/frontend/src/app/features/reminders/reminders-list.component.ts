import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { RouterLink }     from '@angular/router';
import { HttpClient }     from '@angular/common/http';
import { ButtonModule }   from 'primeng/button';
import { TableModule }    from 'primeng/table';
import { TagModule }      from 'primeng/tag';
import { ToastModule }    from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { VehicleService } from '../../core/services/vehicle.service';
import { MakeLogoComponent } from '../../core/make-logo.component';

@Component({
  selector: 'app-reminders-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, TableModule, TagModule, ToastModule, MakeLogoComponent],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="page">
      <div class="page-header">
        <h1>Reminders</h1>
        <p-button label="Add reminder" icon="pi pi-plus" routerLink="/reminders/new" />
      </div>

      <p-table [value]="reminders()" [loading]="loading()"
        sortField="nextDueDate" [sortOrder]="1"
        emptyMessage="No reminders set." styleClass="p-datatable-sm">
        <ng-template pTemplate="header">
          <tr>
            <th>Task</th>
            <th>Vehicle</th>
            <th>Next due (date)</th>
            <th>Next due (mileage)</th>
            <th>Priority</th>
            <th>Status</th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr [class.overdue]="isOverdue(r)">
            <td>
              <span class="task-title">{{ r.title }}</span>
              <div *ngIf="r.description" class="task-desc">{{ r.description }}</div>
            </td>
            <td>
              <span class="veh-cell">
                <app-make-logo [make]="r.vehicle?.make" size="sm" />
                <span>{{ r.vehicle?.make }} {{ r.vehicle?.model }}<ng-container *ngIf="r.vehicle?.trim"> {{ r.vehicle.trim }}</ng-container></span>
              </span>
            </td>
            <td>
              <span *ngIf="r.nextDueDate" [class.overdue-text]="isOverdue(r)">
                {{ r.nextDueDate | date:'mediumDate' }}
              </span>
              <span *ngIf="!r.nextDueDate">—</span>
            </td>
            <td>{{ r.nextDueMileage ? (r.nextDueMileage | number) + ' mi' : '—' }}</td>
            <td>
              <p-tag [value]="r.priority"
                [severity]="r.priority === 'CRITICAL' ? 'danger' : r.priority === 'HIGH' ? 'warn' : 'secondary'" />
            </td>
            <td>
              <p-tag [value]="isOverdue(r) ? 'Overdue' : 'Active'"
                [severity]="isOverdue(r) ? 'danger' : 'success'" />
            </td>
            <td>
              <p-button icon="pi pi-check" [text]="true" size="small"
                pTooltip="Mark done" (onClick)="markDone(r)" />
              <p-button icon="pi pi-pencil" [text]="true" size="small"
                [routerLink]="['/reminders', r.id]" />
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
    .veh-cell{display:flex;align-items:center;gap:0.5rem;}
    .task-title{font-weight:500;font-size:0.875rem;}
    .task-desc{font-size:0.75rem;color:var(--p-text-muted-color);}
    .overdue-text{color:var(--p-red-600);font-weight:500;}
    :host ::ng-deep tr.overdue td:first-child{border-left:3px solid var(--p-red-500);}
  `],
})
export class RemindersListComponent implements OnInit {
  reminders = signal<any[]>([]);
  loading   = signal(true);

  constructor(
    private http: HttpClient,
    private vehicleSvc: VehicleService,
    private msg: MessageService,
  ) {}

  ngOnInit() {
    this.http.get<any[]>('/api/reminders/upcoming').subscribe(r => {
      this.reminders.set(r); this.loading.set(false);
    });
  }

  isOverdue(r: any): boolean {
    return r.nextDueDate && new Date(r.nextDueDate) < new Date();
  }

  markDone(r: any) {
    const mileage = r.vehicle?.currentMileage ?? 0;
    this.http.patch(`/api/reminders/${r.id}/complete`, { currentMileage: mileage }).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Done!', detail: `${r.title} marked complete` });
        this.ngOnInit();
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to update' }),
    });
  }
}
