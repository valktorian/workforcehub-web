export interface UpdatePersonalInfoRequest {
  accountId: string;
  personalEmail: string | null;
  phoneNumber: string | null;
  address: string | null;
  dateOfBirth: string | null;
}
