import { Component } from '@angular/core';
import { CommonModule }         from '@angular/common';
import { FormsModule }          from '@angular/forms';
import { Router, RouterLink }   from '@angular/router';
import { InputTextModule }      from 'primeng/inputtext';
import { PasswordModule }       from 'primeng/password';
import { ButtonModule }         from 'primeng/button';
import { CardModule }           from 'primeng/card';
import { MessageModule }        from 'primeng/message';
import { AuthService }          from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InputTextModule, PasswordModule, ButtonModule, CardModule, MessageModule],
  template: `
    <div class="auth-page">
      <p-card styleClass="auth-card">
        <ng-template pTemplate="header">
          <div class="auth-logo">
            <i class="pi pi-car" style="font-size:2rem;color:var(--p-primary-500)"></i>
            <h2 style="margin:0.5rem 0 0">GarageSage</h2>
            <p style="margin:0.25rem 0;color:var(--p-text-muted-color);font-size:0.875rem">
              Your personal garage, self-hosted
            </p>
          </div>
        </ng-template>

        <p-message *ngIf="error" severity="error" [text]="error" styleClass="mb-3 w-full" />

        <div class="field">
          <label for="email">Email</label>
          <input pInputText id="email" type="email" [(ngModel)]="email"
            placeholder="you@example.com" class="w-full" (keyup.enter)="submit()" />
        </div>
        <div class="field mt-3">
          <label for="password">Password</label>
          <p-password id="password" [(ngModel)]="password"
            [feedback]="false" [toggleMask]="true"
            placeholder="Password" styleClass="w-full" (onKeyUp)="onKey($event)" />
        </div>

        <p-button
          label="Sign in" icon="pi pi-sign-in"
          styleClass="w-full mt-4"
          [loading]="loading" (onClick)="submit()"
        />

        <p class="text-center mt-3" style="font-size:0.875rem">
          No account? <a routerLink="/register">Register</a>
        </p>
      </p-card>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg);
    }
    .auth-card { width: 100%; max-width: 400px; }
    .auth-logo { text-align: center; padding: 1.5rem 1.5rem 0; }
    .field label { display: block; font-size: 0.875rem; margin-bottom: 0.35rem; }
  `],
})
export class LoginComponent {
  email    = '';
  password = '';
  loading  = false;
  error    = '';

  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  onKey(e: KeyboardEvent) { if (e.key === 'Enter') this.submit(); }

  submit() {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.error   = '';
    this.auth.login(this.email, this.password).subscribe({
      next:  () => this.router.navigate(['/dashboard']),
      error: e  => { this.error = e.error?.message ?? 'Login failed'; this.loading = false; },
    });
  }
}
