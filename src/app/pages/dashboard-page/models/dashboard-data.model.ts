import { DashboardProfileResponse } from './dashboard-profile-response.model';

export interface DashboardData {
  profiles: DashboardProfileResponse[];
  employeeCount: number;
  pendingLeaveCount: number;
  pendingTimesheetCount: number;
}
