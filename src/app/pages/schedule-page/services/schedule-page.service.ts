import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../../../core/api/api.config';
import {
  ApiResponse,
  CommandAcceptedResponse,
  CreateLeaveRequestRequest,
  CreateTimeEntryRequest,
  Holiday,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  PagedResponse,
  ScheduleData,
  TimeEntry,
  Timesheet,
} from '../models';

@Injectable({ providedIn: 'root' })
export class SchedulePageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  async load(from: string, to: string): Promise<ScheduleData> {
    const range = new HttpParams().set('from', from).set('to', to);
    const period = new HttpParams().set('periodStart', from).set('periodEnd', to);
    const holidays = new HttpParams().set('year', from.slice(0, 4)).set('country', 'MA');
    const [timeEntries, timesheets, leaveRequests, leaveBalances, holidayList, leaveTypes] =
      await Promise.all([
        this.get<TimeEntry[]>('/api/time-entries/self', range),
        this.get<Timesheet[]>('/api/timesheets/self', period),
        this.get<LeaveRequest[]>('/api/leave-requests/self'),
        this.get<LeaveBalance[]>('/api/leave-balances/self'),
        this.get<Holiday[]>('/api/holidays', holidays),
        this.get<LeaveType[]>('/api/leave-types'),
      ]);
    return { timeEntries, timesheets, leaveRequests, leaveBalances, holidays: holidayList, leaveTypes };
  }

  getEmployeeId(): Promise<string> {
    return this.get<{ id: string }>('/api/profiles/self').then((profile) => profile.id);
  }

  createTimeEntry(request: CreateTimeEntryRequest): Promise<CommandAcceptedResponse> {
    return firstValueFrom(
      this.http.post<CommandAcceptedResponse>(
        apiUrl('/api/time-entries', this.baseUrl),
        request,
      ),
    );
  }

  updateTimeEntry(id: string, request: CreateTimeEntryRequest): Promise<unknown> {
    return firstValueFrom(this.http.put(apiUrl(`/api/time-entries/${id}`, this.baseUrl), request));
  }

  deleteTimeEntry(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(apiUrl(`/api/time-entries/${id}`, this.baseUrl)));
  }

  createLeaveRequest(request: CreateLeaveRequestRequest): Promise<{ id: string }> {
    return firstValueFrom(
      this.http.post<{ id: string }>(apiUrl('/api/leave-requests', this.baseUrl), request),
    );
  }

  submitLeaveRequest(id: string): Promise<unknown> {
    return firstValueFrom(
      this.http.post(apiUrl(`/api/leave-requests/${id}/submit`, this.baseUrl), {}),
    );
  }

  submitTimesheet(id: string): Promise<unknown> {
    return firstValueFrom(this.http.post(apiUrl(`/api/timesheets/${id}/submit`, this.baseUrl), {}));
  }

  getPendingLeaveRequests(): Promise<PagedResponse<LeaveRequest>> {
    const params = new HttpParams().set('PageNumber', 1).set('PageSize', 50);
    return this.get<PagedResponse<LeaveRequest>>('/api/leave-requests/pending-approval', params);
  }

  reviewLeaveRequest(id: string, decision: 'approve' | 'reject', comment: string): Promise<unknown> {
    return firstValueFrom(
      this.http.post(
        apiUrl(`/api/leave-requests/${id}/${decision}`, this.baseUrl),
        { comment: comment.trim() || null },
      ),
    );
  }

  private get<T>(path: string, params?: HttpParams): Promise<T> {
    return firstValueFrom(
      this.http.get<ApiResponse<T>>(apiUrl(path, this.baseUrl), { params }),
    ).then((response) => response.data);
  }
}
