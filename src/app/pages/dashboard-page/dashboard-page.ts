import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DashboardProfileResponse } from './models';
import { DashboardPageService } from './services/dashboard-page.service';

type StatCard = {
  label: string;
  value: string;
  detail: string;
  tone: 'healthy' | 'warning' | 'critical';
};

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage implements OnInit {
  private readonly service = inject(DashboardPageService);

  protected readonly loading = signal(true);
  protected readonly employeeCount = signal<number | null>(null);
  protected readonly pendingLeaveCount = signal<number | null>(null);
  protected readonly pendingTimesheetCount = signal<number | null>(null);
  protected readonly employees = signal<DashboardProfileResponse[]>([]);

  protected readonly stats = computed<StatCard[]>(() => [
    {
      label: 'Employees',
      value: this.metric(this.employeeCount()),
      detail: 'Total profiles currently registered.',
      tone: 'healthy',
    },
    {
      label: 'Leave approvals',
      value: this.metric(this.pendingLeaveCount()),
      detail: 'Leave requests waiting for approval.',
      tone: 'warning',
    },
    {
      label: 'Timesheet approvals',
      value: this.metric(this.pendingTimesheetCount()),
      detail: 'Timesheets waiting for approval.',
      tone: 'critical',
    },
  ]);

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.service.load();
      this.employeeCount.set(data.employeeCount);
      this.employees.set(data.profiles);
      this.pendingLeaveCount.set(data.pendingLeaveCount);
      this.pendingTimesheetCount.set(data.pendingTimesheetCount);
    } catch {
      this.employeeCount.set(null);
      this.pendingLeaveCount.set(null);
      this.pendingTimesheetCount.set(null);
    }
    this.loading.set(false);
  }

  protected displayName(profile: DashboardProfileResponse): string {
    return [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Unnamed profile';
  }

  private metric(value: number | null): string {
    return value === null ? '—' : String(value);
  }
}
