import { inject }  from '@angular/core';
import { Router }  from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};

export const guestGuard = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? router.createUrlTree(['/dashboard']) : true;
};
