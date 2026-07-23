export interface PendingLeaveResponse {
  id: string;
  accountId: string | null;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
  reason: string | null;
  submittedAt: string | null;
  decisionAt: string | null;
  createdAt: string;
  updatedAt: string;
}
