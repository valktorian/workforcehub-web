import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import {
  DashboardProfileResponse,
  PendingLeaveResponse,
  PendingTimesheetResponse,
} from './models';
import { DashboardPageService } from './services/dashboard-page.service';

type StatCard = {
  label: string;
  value: string;
  detail: string;
  tone: 'healthy' | 'warning' | 'critical';
  link?: string;
};

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage implements OnInit {
  private readonly service = inject(DashboardPageService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly role = this.auth.role;
  protected readonly isEmployee = computed(() => this.role()?.toLowerCase() === 'employee');
  protected readonly isHr = computed(() => this.auth.hasAnyRole(['HRAdmin', 'HRManager']));
  protected readonly employeeCount = signal<number | null>(null);
  protected readonly pendingLeaveCount = signal<number | null>(null);
  protected readonly pendingTimesheetCount = signal<number | null>(null);
  protected readonly employees = signal<DashboardProfileResponse[]>([]);
  protected readonly selfProfile = signal<DashboardProfileResponse | null>(null);
  protected readonly selfLeaveRequests = signal<PendingLeaveResponse[]>([]);
  protected readonly selfTimesheets = signal<PendingTimesheetResponse[]>([]);
  protected readonly selfBalances = signal<
    { leaveType: string; available: number; pending: number }[]
  >([]);

  protected readonly stats = computed<StatCard[]>(() => {
    if (this.isEmployee()) {
      return [
        {
          label: 'Leave requests',
          value: String(this.selfLeaveRequests().length),
          detail: 'Your submitted and draft requests.',
          tone: 'warning',
          link: '/schedule',
        },
        {
          label: 'Timesheets',
          value: String(this.selfTimesheets().length),
          detail: 'Your current reporting periods.',
          tone: 'critical',
          link: '/schedule',
        },
        {
          label: 'Leave balances',
          value: String(this.selfBalances().length),
          detail: 'Available leave categories.',
          tone: 'healthy',
          link: '/schedule',
        },
      ];
    }

    const cards: StatCard[] = [
      {
        label: 'Leave approvals',
        value: this.metric(this.pendingLeaveCount()),
        detail: 'Leave requests waiting for approval.',
        tone: 'warning',
        link: '/schedule',
      },
      {
        label: 'Timesheet approvals',
        value: this.metric(this.pendingTimesheetCount()),
        detail: 'Timesheets waiting for approval.',
        tone: 'critical',
        link: '/schedule',
      },
    ];
    if (this.isHr()) {
      cards.unshift({
        label: 'Employees',
        value: this.metric(this.employeeCount()),
        detail: 'Total profiles currently registered.',
        tone: 'healthy',
        link: '/employees',
      });
    }
    return cards;
  });

  async ngOnInit(): Promise<void> {
    if (this.isEmployee()) {
      const data = await this.service.getEmployeeDashboard();
      this.selfProfile.set(data.profile);
      this.selfLeaveRequests.set(data.leaveRequests);
      this.selfTimesheets.set(data.timesheets);
      this.selfBalances.set(data.leaveBalances);
      this.loading.set(false);
      return;
    }

    const requests: Promise<void>[] = [
      this.service
        .getPendingLeave()
        .then((result) => this.pendingLeaveCount.set(result.totalCount))
        .catch(() => this.pendingLeaveCount.set(null)),
      this.service
        .getPendingTimesheets()
        .then((result) => this.pendingTimesheetCount.set(result.totalCount))
        .catch(() => this.pendingTimesheetCount.set(null)),
    ];
    if (this.isHr()) {
      requests.push(
        this.service
          .getProfiles()
          .then((result) => {
            this.employeeCount.set(result.totalCount);
            this.employees.set(result.items);
          })
          .catch(() => this.employeeCount.set(null)),
      );
    }
    await Promise.all(requests);
    this.loading.set(false);
  }

  protected displayName(profile: DashboardProfileResponse): string {
    return [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Unnamed profile';
  }

  private metric(value: number | null): string {
    return value === null ? '—' : String(value);
  }
}
