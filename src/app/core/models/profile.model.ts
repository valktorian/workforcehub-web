export interface Profile {
  id?: string;
  profileId?: string;
  employeeNumber?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  workEmail?: string | null;
  personalEmail?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  managerProfileId?: string | null;
  employmentType?: string | null;
  hireDate?: string | null;
  organizationRole?: string | null;
  employmentStatus?: string | null;
  accountId?: string | null;
  profilePictureUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ApiResponse<T> {
  success?: boolean;
  message?: string | null;
  data?: T;
}

export type ProfileResponse = Profile | ApiResponse<Profile>;

export function unwrapProfile(response: ProfileResponse | undefined): Profile | null {
  if (!response) return null;
  if ('data' in response) return response.data ?? null;
  return response;
}
