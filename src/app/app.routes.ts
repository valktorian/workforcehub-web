import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { guestGuard } from './core/auth/guest.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login-page/login-page').then((m) => m.LoginPage),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard-page/dashboard-page').then((m) => m.DashboardPage),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile-page/profile-page').then((m) => m.ProfilePage),
  },
  {
    path: 'profile/details',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/profile-details-page/profile-details-page').then((m) => m.ProfileDetailsPage),
  },
  {
    path: 'employees',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['HRAdmin', 'HRManager'] },
    loadComponent: () =>
      import('./pages/employees-page/employees-page').then((m) => m.EmployeesPage),
  },
  {
    path: 'schedule',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/schedule-page/schedule-page').then((m) => m.SchedulePage),
  },
  {
    path: 'accounts',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['HRAdmin', 'HRManager'] },
    loadComponent: () =>
      import('./pages/settings-page/settings-page').then((m) => m.SettingsPage),
  },
  {
    path: 'settings',
    redirectTo: 'accounts',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
