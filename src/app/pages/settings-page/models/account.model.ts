export interface Account {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountCommandResponse extends Omit<Account, 'id'> {
  accountId: string;
}
