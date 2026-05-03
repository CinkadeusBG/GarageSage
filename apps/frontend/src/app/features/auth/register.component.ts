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
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InputTextModule, PasswordModule, ButtonModule, CardModule, MessageModule],
  template: `
    <div class="auth-page">
      <p-card styleClass="auth-card">
        <ng-template pTemplate="header">
          <div class="auth-logo">
            <i class="pi pi-car" style="font-size:2rem;color:var(--p-primary-500)"></i>
            <h2 style="margin:0.5rem 0 0">Create account</h2>
          </div>
        </ng-template>

        <p-message *ngIf="error" severity="error" [text]="error" styleClass="mb-3 w-full" />

        <div class="field">
          <label>Name (optional)</label>
          <input pInputText type="text" [(ngModel)]="name" placeholder="Your name" class="w-full" />
        </div>
        <div class="field mt-3">
          <label>Email</label>
          <input pInputText type="email" [(ngModel)]="email" placeholder="you@example.com" class="w-full" />
        </div>
        <div class="field mt-3">
          <label>Password</label>
          <p-password [(ngModel)]="password" [toggleMask]="true" placeholder="Min. 8 characters" styleClass="w-full" />
        </div>

        <p-button
          label="Create account" icon="pi pi-user-plus"
          styleClass="w-full mt-4"
          [loading]="loading" (onClick)="submit()"
        />

        <p class="text-center mt-3" style="font-size:0.875rem">
          Already have an account? <a routerLink="/login">Sign in</a>
        </p>
      </p-card>
    </div>
  `,
  styles: [`
    .auth-page { min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--p-surface-100); }
    .auth-card { width:100%;max-width:400px; }
    .auth-logo { text-align:center;padding:1.5rem 1.5rem 0; }
    .field label { display:block;font-size:0.875rem;margin-bottom:0.35rem; }
  `],
})
export class RegisterComponent {
  name = ''; email = ''; password = '';
  loading = false; error = '';

  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  submit() {
    if (!this.email || !this.password) return;
    this.loading = true; this.error = '';
    this.auth.register(this.email, this.password, this.name || undefined).subscribe({
      next:  () => this.router.navigate(['/dashboard']),
      error: e  => { this.error = e.error?.message ?? 'Registration failed'; this.loading = false; },
    });
  }
}
