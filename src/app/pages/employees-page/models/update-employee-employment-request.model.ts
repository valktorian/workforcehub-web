export interface UpdateEmployeeEmploymentRequest {
  profileId: string;
  jobTitle: string;
  department: string;
  managerProfileId: string | null;
  employmentType: string;
  hireDate: string;
  organizationRole: string;
}
