export interface CreateAccountRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface UpdateAccountRequest {
  accountId: string;
  email: string;
  firstName: string;
  lastName: string;
}
