import { AuthUser } from './auth-user.model';

export interface AuthSession extends AuthUser {
  accessToken: string;
}
