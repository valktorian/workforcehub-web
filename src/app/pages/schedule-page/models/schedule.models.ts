export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PagedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  hours: number;
  projectCode: string;
  taskCode: string;
  notes?: string;
  status: string;
}

export interface Timesheet {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  status: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
  reason?: string;
}

export interface LeaveBalance {
  id: string;
  leaveType: string;
  available: number;
  used: number;
  pending: number;
}

export interface Holiday {
  date: string;
  name: string;
  country: string;
}

export interface LeaveType {
  code: string;
  name: string;
  isPaid: boolean;
}

export interface ScheduleData {
  timeEntries: TimeEntry[];
  timesheets: Timesheet[];
  leaveRequests: LeaveRequest[];
  leaveBalances: LeaveBalance[];
  holidays: Holiday[];
  leaveTypes: LeaveType[];
}

export interface CreateTimeEntryRequest {
  employeeId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  projectCode: string;
  taskCode: string;
  notes?: string;
}

export interface CreateLeaveRequestRequest {
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
}
