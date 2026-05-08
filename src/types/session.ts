export type UserRole = 'operator' | 'passenger' | 'auxiliary';

export interface UserSession {
  userId: string;
  userName: string;
  email?: string;
  role: UserRole;
  token?: string;
  employeeId?: string;
  otp?: string;
  description?: string;
}
