import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/dashboard-page/dashboard-page').then((m) => m.DashboardPage)
  },
  {
    path: 'employees',
    loadComponent: () =>
      import('./pages/employees-page/employees-page').then((m) => m.EmployeesPage)
  },
  {
    path: 'schedule',
    loadComponent: () =>
      import('./pages/schedule-page/schedule-page').then((m) => m.SchedulePage)
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings-page/settings-page').then((m) => m.SettingsPage)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
