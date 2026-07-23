export interface PendingTimesheetResponse {
  id: string;
  accountId: string | null;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
