import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

export const roleGuard: CanActivateFn = (route): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const roles = route.data['roles'];
  const allowedRoles = Array.isArray(roles) ? roles.map(String) : [];

  return authService.hasAnyRole(allowedRoles) ? true : router.createUrlTree(['/profile']);
};
