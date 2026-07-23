export interface EmployeeProfileResponse {
  id: string;
  accountId: string | null;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  personalEmail: string | null;
  phoneNumber: string | null;
  address: string | null;
  profilePictureUrl: string | null;
  dateOfBirth: string | null;
  jobTitle: string;
  department: string;
  managerProfileId: string | null;
  employmentType: string;
  hireDate: string;
  organizationRole: string;
  employmentStatus: string;
  createdAt: string;
  updatedAt: string;
}
