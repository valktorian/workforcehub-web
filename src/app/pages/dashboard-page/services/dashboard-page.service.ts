import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../../../core/api/api.config';
import {
  ApiResponse,
  DashboardProfileResponse,
  PagedResponse,
  PendingLeaveResponse,
  PendingTimesheetResponse,
} from '../models';

export interface EmployeeDashboardData {
  profile: DashboardProfileResponse | null;
  leaveRequests: PendingLeaveResponse[];
  timesheets: PendingTimesheetResponse[];
  leaveBalances: { leaveType: string; available: number; pending: number }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardPageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getProfiles(): Promise<PagedResponse<DashboardProfileResponse>> {
    const params = new HttpParams().set('PageNumber', 1).set('PageSize', 5);
    return this.get<PagedResponse<DashboardProfileResponse>>('/api/profiles', params);
  }

  getPendingLeave(): Promise<PagedResponse<PendingLeaveResponse>> {
    const params = new HttpParams().set('PageNumber', 1).set('PageSize', 5);
    return this.get<PagedResponse<PendingLeaveResponse>>(
      '/api/leave-requests/pending-approval',
      params,
    );
  }

  getPendingTimesheets(): Promise<PagedResponse<PendingTimesheetResponse>> {
    const params = new HttpParams().set('PageNumber', 1).set('PageSize', 5);
    return this.get<PagedResponse<PendingTimesheetResponse>>(
      '/api/timesheets/pending-approval',
      params,
    );
  }

  async getEmployeeDashboard(): Promise<EmployeeDashboardData> {
    const [profile, leaveRequests, timesheets, leaveBalances] = await Promise.allSettled([
      this.get<DashboardProfileResponse>('/api/profiles/self'),
      this.get<PendingLeaveResponse[]>('/api/leave-requests/self'),
      this.get<PendingTimesheetResponse[]>('/api/timesheets/self'),
      this.get<{ leaveType: string; available: number; pending: number }[]>(
        '/api/leave-balances/self',
      ),
    ]);
    return {
      profile: profile.status === 'fulfilled' ? profile.value : null,
      leaveRequests: leaveRequests.status === 'fulfilled' ? leaveRequests.value : [],
      timesheets: timesheets.status === 'fulfilled' ? timesheets.value : [],
      leaveBalances: leaveBalances.status === 'fulfilled' ? leaveBalances.value : [],
    };
  }

  private get<T>(path: string, params?: HttpParams): Promise<T> {
    return firstValueFrom(
      this.http.get<ApiResponse<T>>(apiUrl(path, this.baseUrl), { params }),
    ).then((response) => response.data);
  }
}
