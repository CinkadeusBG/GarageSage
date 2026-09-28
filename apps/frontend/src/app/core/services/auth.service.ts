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
const MONTH_SECONDS = 60 * 60 * 24 * 30;

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

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
    this.clearToken();
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? readCookie(TOKEN_KEY);
  }

  refreshProfile() {
    return this.http.get<User>('/api/auth/me').pipe(
      tap(user => this._user.set(user)),
    );
  }

  private handleAuth(res: AuthResponse) {
    this.persistToken(res.access_token);
    this._user.set(res.user);
  }

  private loadStoredUser() {
    const token = this.getToken();
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        this.clearToken();
        return;
      }
      // Restore into both stores so a later page load still finds it.
      this.persistToken(token);
      // Set user immediately from the token so route guards pass before /api/auth/me returns.
      this._user.set({
        id:        payload.sub,
        email:     payload.email,
        name:      payload.name ?? '',
        role:      payload.role ?? 'USER',
        createdAt: '',
      });
      this.http.get<User>('/api/auth/me').subscribe({
        next: user => this._user.set(user),
      });
    } catch {
      this.clearToken();
    }
  }

  private persistToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
    document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; Max-Age=${MONTH_SECONDS}; Path=/; SameSite=Lax`;
  }

  private clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    document.cookie = `${TOKEN_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
}
