import { Injectable, signal, computed } from '@angular/core';
import { HttpClient }  from '@angular/common/http';
import { Router }      from '@angular/router';
import { tap }         from 'rxjs/operators';

export interface User {
  id:        string;
  email:     string;
  name?:     string;
  role:      string;
  createdAt: string;
}

interface AuthResponse {
  user:         User;
  access_token: string;
}

const TOKEN_KEY = 'gs_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<User | null>(null);
  readonly user          = this._user.asReadonly();
  readonly isLoggedIn    = computed(() => !!this._user());

  constructor(private readonly http: HttpClient, private readonly router: Router) {
    this.loadStoredUser();
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password }).pipe(
      tap(res => this.handleAuth(res)),
    );
  }

  register(email: string, password: string, name?: string) {
    return this.http.post<AuthResponse>('/api/auth/register', { email, password, name }).pipe(
      tap(res => this.handleAuth(res)),
    );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  refreshProfile() {
    return this.http.get<User>('/api/auth/me').pipe(
      tap(user => this._user.set(user)),
    );
  }

  private handleAuth(res: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, res.access_token);
    this._user.set(res.user);
  }

  private loadStoredUser() {
    const token = this.getToken();
    if (!token) return;
    // Decode JWT payload (no library needed for display purposes)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem(TOKEN_KEY);
        return;
      }
      // Fetch fresh profile
      this.http.get<User>('/api/auth/me').subscribe({
        next:  user => this._user.set(user),
        error: ()   => localStorage.removeItem(TOKEN_KEY),
      });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
}
