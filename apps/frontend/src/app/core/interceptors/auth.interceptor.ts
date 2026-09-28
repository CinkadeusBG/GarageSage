import { HttpInterceptorFn } from '@angular/common/http';
import { inject }            from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService }       from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const token = auth.getToken();
  const authed = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError(err => {
      // A rebuild makes the API unreachable for a moment (status 0). That is not a logout.
      // Only an explicit rejection of this token ends the session.
      const isCredentialCheck = req.url.includes('/api/auth/login') || req.url.includes('/api/auth/register');
      if (err?.status === 401 && token && !isCredentialCheck) auth.logout();
      return throwError(() => err);
    }),
  );
};
