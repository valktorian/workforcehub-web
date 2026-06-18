import { Component } from '@angular/core';

type StatCard = {
  label: string;
  value: string;
  detail: string;
  trend: string;
  description: string;
  tone: string;
};

type Employee = {
  id: number;
  fullName: string;
  role: string;
  team: string;
  status: 'On duty' | 'Off today' | 'On leave';
  shift: string;
  attendanceRate: number;
};

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  template: `
    <section class="page">
      <div class="hero">
        <p class="eyebrow">Dashboard</p>
        <h2>One route, one page, one responsibility.</h2>
        <p class="lead">
          This is our landing page route. In Angular 21, routed screens are often standalone
          components loaded directly from the router.
        </p>
      </div>

      <div class="stats">
        @for (item of stats; track item.label) {
          <article class="card">
            <p class="card-label">{{ item.label }}</p>
            <strong>{{ item.value }}</strong>
            <span>{{ item.detail }}</span>
          </article>
        }
      </div>

      <section class="employee-preview">
        <div class="section-heading">
          <p class="eyebrow">On duty today</p>
          <h3>Quick employee snapshot</h3>
        </div>

        <ul class="employee-list">
          @for (employee of employees.slice(0, 3); track employee.id) {
            <li class="employee-item">
              <div>
                <strong class="employee-name">{{ employee.fullName }}</strong>
                <p class="employee-role">{{ employee.role }}</p>
              </div>
              <span class="employee-status">{{ employee.status }}</span>
            </li>
          }
        </ul>
      </section>
    </section>
  `,
  styles: `
    .page {
      display: grid;
      gap: 1.5rem;
    }

    .hero,
    .card,
    .employee-preview {
      padding: 1.5rem;
      border-radius: 1.5rem;
      background: rgba(8, 18, 34, 0.72);
      border: 1px solid rgba(173, 205, 240, 0.12);
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.16);
    }

    .eyebrow,
    .card-label {
      margin: 0 0 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.74rem;
      color: #7fbeff;
    }

    h2,
    p,
    strong,
    span {
      margin: 0;
      color: #f4f8fc;
    }

    .lead,
    span {
      color: #abc0d7;
      line-height: 1.6;
    }

    .stats {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }

    strong {
      display: block;
      font-size: 1.8rem;
      margin-bottom: 0.5rem;
    }

    .section-heading h3,
    .employee-name,
    .employee-role,
    .employee-status {
      margin: 0;
      color: #f4f8fc;
    }

    .section-heading h3 {
      font-size: 1.2rem;
    }

    .employee-list {
      list-style: none;
      margin: 1rem 0 0;
      padding: 0;
      display: grid;
      gap: 0.85rem;
    }

    .employee-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.1rem;
      border-radius: 1rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(173, 205, 240, 0.1);
    }

    .employee-name {
      font-size: 1rem;
      margin-bottom: 0.2rem;
    }

    .employee-role {
      color: #abc0d7;
    }

    .employee-status {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.4rem 0.75rem;
      border-radius: 999px;
      background: rgba(127, 190, 255, 0.14);
      color: #9fd2ff;
      font-size: 0.9rem;
      white-space: nowrap;
    }
  `,
})
export class DashboardPage {
  protected readonly stats: StatCard[] = [
    {
      label: 'Employees',
      value: '24',
      detail: 'A first mock metric rendered from page state.',
      trend: 'up',
      description: 'hahaha',
      tone: 'healthy',
    },
    {
      label: 'Open shifts',
      value: '6',
      detail: 'A placeholder number we will later connect to real data.',
      trend: 'down',
      description: 'stupidhahaha',
      tone: 'critical',
    },
    {
      label: 'Teams',
      value: '4',
      detail: 'A simple card list showing Angular 21 control flow with @for.',
      trend: 'stable',
      description: 'qfearhahaha',
      tone: 'warning',
    },
  ];

  protected readonly employees: Employee[] = [
    {
      id: 1,
      fullName: 'Sarah Johnson',
      role: 'Store Manager',
      team: 'Operations',
      status: 'On duty',
      shift: '08:00 - 16:00',
      attendanceRate: 98,
    },
    {
      id: 2,
      fullName: 'Michael Chen',
      role: 'HR Specialist',
      team: 'People',
      status: 'Off today',
      shift: 'Off',
      attendanceRate: 95,
    },
    {
      id: 3,
      fullName: 'Amina Haddad',
      role: 'Support Lead',
      team: 'Customer Support',
      status: 'On duty',
      shift: '09:00 - 17:00',
      attendanceRate: 97,
    },
    {
      id: 4,
      fullName: 'Lucas Martin',
      role: 'Scheduler',
      team: 'Planning',
      status: 'On leave',
      shift: 'Leave',
      attendanceRate: 92,
    },
    {
      id: 5,
      fullName: 'Nina Patel',
      role: 'Recruiter',
      team: 'People',
      status: 'On duty',
      shift: '10:00 - 18:00',
      attendanceRate: 96,
    },
  ];
}
