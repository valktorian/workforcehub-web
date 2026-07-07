import { Component } from '@angular/core';

type StatCard = {
  label: string;
  value: string;
  detail: string;
  tone: 'healthy' | 'warning' | 'critical';
};

type Employee = {
  id: number;
  fullName: string;
  role: string;
  team: string;
  status: 'On duty' | 'Off today' | 'On leave';
};

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  protected readonly stats: StatCard[] = [
    {
      label: 'Employees',
      value: '24',
      detail: 'Mock workforce size until the profiles endpoint is connected.',
      tone: 'healthy',
    },
    {
      label: 'Pending access',
      value: '3',
      detail: 'Role-aware areas are already guarded in the router.',
      tone: 'warning',
    },
    {
      label: 'Open tasks',
      value: '6',
      detail: 'A compact snapshot for future operational widgets.',
      tone: 'critical',
    },
  ];

  protected readonly employees: Employee[] = [
    {
      id: 1,
      fullName: 'Sarah Johnson',
      role: 'Store Manager',
      team: 'Operations',
      status: 'On duty',
    },
    {
      id: 2,
      fullName: 'Michael Chen',
      role: 'HR Specialist',
      team: 'People',
      status: 'Off today',
    },
    {
      id: 3,
      fullName: 'Amina Haddad',
      role: 'Support Lead',
      team: 'Customer Support',
      status: 'On duty',
    },
  ];
}
