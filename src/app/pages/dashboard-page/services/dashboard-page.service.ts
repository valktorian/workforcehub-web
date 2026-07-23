import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../../../core/api/api.config';
import {
  ApiResponse,
  DashboardData,
  DashboardProfileResponse,
  PagedResponse,
  PendingLeaveResponse,
  PendingTimesheetResponse,
} from '../models';

@Injectable({ providedIn: 'root' })
export class DashboardPageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  async load(): Promise<DashboardData> {
    const profileParams = new HttpParams().set('PageNumber', 1).set('PageSize', 5);
    const countParams = new HttpParams().set('PageNumber', 1).set('PageSize', 1);

    const [profiles, leaveRequests, timesheets] = await Promise.all([
      firstValueFrom(
        this.http.get<ApiResponse<PagedResponse<DashboardProfileResponse>>>(
          apiUrl('/api/profiles', this.baseUrl),
          { params: profileParams },
        ),
      ),
      firstValueFrom(
        this.http.get<ApiResponse<PagedResponse<PendingLeaveResponse>>>(
          apiUrl('/api/leave-requests/pending-approval', this.baseUrl),
          { params: countParams },
        ),
      ),
      firstValueFrom(
        this.http.get<ApiResponse<PagedResponse<PendingTimesheetResponse>>>(
          apiUrl('/api/timesheets/pending-approval', this.baseUrl),
          { params: countParams },
        ),
      ),
    ]);

    return {
      profiles: profiles.data.items,
      employeeCount: profiles.data.totalCount,
      pendingLeaveCount: leaveRequests.data.totalCount,
      pendingTimesheetCount: timesheets.data.totalCount,
    };
  }
}
