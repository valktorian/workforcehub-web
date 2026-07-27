export interface OnboardingAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface AccountCommandResponse {
  accountId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
