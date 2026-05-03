import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule }    from '@angular/common';
import { ButtonModule }    from 'primeng/button';
import { AvatarModule }    from 'primeng/avatar';
import { ToastModule }     from 'primeng/toast';
import { MessageService }  from 'primeng/api';
import { AuthService }     from '../services/auth.service';
import { VehicleService }  from '../services/vehicle.service';

interface NavItem {
  label: string;
  icon:  string;
  route: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    ButtonModule, AvatarModule, ToastModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="shell-layout" [class.sidebar-collapsed]="collapsed()">

      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <span class="logo" *ngIf="!collapsed()">
            <i class="pi pi-car"></i> GarageSage
          </span>
          <p-button
            [icon]="collapsed() ? 'pi pi-angle-right' : 'pi pi-angle-left'"
            [text]="true" severity="secondary" size="small"
            (onClick)="collapsed.update(v => !v)"
          />
        </div>

        <nav class="sidebar-nav">
          <a *ngFor="let item of navItems"
            [routerLink]="item.route"
            routerLinkActive="active"
            class="nav-item"
            [title]="item.label">
            <i [class]="'pi ' + item.icon"></i>
            <span *ngIf="!collapsed()" class="nav-label">{{ item.label }}</span>
          </a>
        </nav>

        <div class="sidebar-footer" *ngIf="!collapsed()">
          <p-avatar
            [label]="userInitial()"
            shape="circle" size="normal"
            styleClass="mr-2"
          />
          <span class="user-name">{{ auth.user()?.name ?? auth.user()?.email }}</span>
          <p-button
            icon="pi pi-sign-out" [text]="true" severity="secondary" size="small"
            (onClick)="auth.logout()" pTooltip="Sign out"
          />
        </div>
      </aside>

      <!-- Main content -->
      <main class="main-content">
        <router-outlet />
      </main>

    </div>
  `,
  styles: [`
    .shell-layout {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }
    .sidebar {
      width: 220px;
      background: var(--p-surface-900);
      color: var(--p-surface-0);
      display: flex;
      flex-direction: column;
      transition: width 0.2s ease;
      flex-shrink: 0;
    }
    .sidebar-collapsed .sidebar { width: 60px; }
    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 0.75rem 0.5rem;
      border-bottom: 1px solid var(--p-surface-700);
      min-height: 56px;
    }
    .logo {
      font-weight: 600;
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      white-space: nowrap;
    }
    .sidebar-nav {
      flex: 1;
      padding: 0.5rem 0;
      overflow-y: auto;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 1rem;
      color: var(--p-surface-300);
      text-decoration: none;
      border-radius: 6px;
      margin: 2px 6px;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
    }
    .nav-item:hover, .nav-item.active {
      background: var(--p-primary-600);
      color: white;
    }
    .nav-label { font-size: 0.875rem; }
    .sidebar-footer {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      border-top: 1px solid var(--p-surface-700);
      min-height: 56px;
    }
    .user-name {
      flex: 1;
      font-size: 0.8rem;
      color: var(--p-surface-300);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .main-content {
      flex: 1;
      overflow-y: auto;
      background: var(--p-surface-50);
      padding: 1.5rem;
    }
    @media (max-width: 768px) {
      .sidebar { width: 60px; }
      .nav-label, .logo, .user-name { display: none; }
    }
  `],
})
export class ShellComponent implements OnInit {
  collapsed = signal(false);

  navItems: NavItem[] = [
    { label: 'Dashboard',    icon: 'pi-gauge',       route: '/dashboard'   },
    { label: 'Vehicles',     icon: 'pi-car',         route: '/vehicles'    },
    { label: 'Maintenance',  icon: 'pi-wrench',      route: '/maintenance' },
    { label: 'Fuel',         icon: 'pi-database',    route: '/fuel'        },
    { label: 'Reminders',    icon: 'pi-bell',        route: '/reminders'   },
    { label: 'Reports',      icon: 'pi-chart-bar',   route: '/reports'     },
    { label: 'AI Assistant', icon: 'pi-sparkles',    route: '/ai'          },
  ];

  constructor(
    readonly auth: AuthService,
    private readonly vehicles: VehicleService,
  ) {}

  ngOnInit() {
    this.vehicles.load().subscribe();
  }

  userInitial(): string {
    const u = this.auth.user();
    if (!u) return '?';
    return (u.name ?? u.email).charAt(0).toUpperCase();
  }
}
