export interface CreateEmployeeRequest {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  personalEmail: string | null;
  phoneNumber: string | null;
  address: string | null;
  dateOfBirth: string | null;
  jobTitle: string;
  department: string;
  managerProfileId: string | null;
  employmentType: string;
  hireDate: string;
  organizationRole: string;
  employmentStatus: string;
  accountId: string | null;
  profilePictureUrl: string | null;
}
