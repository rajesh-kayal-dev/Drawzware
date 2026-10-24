export interface JwtUserPayload {
  id?: string;
  sub?: string;
  email?: string;
  name?: string;
  exp?: number;
  [key: string]: unknown;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface AuthResult {
  user: UserSummary;
  token: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
