export interface JwtUserPayload {
  id?: string;
  sub?: string;
  email?: string;
  name?: string;
  isEmailVerified?: boolean;
  tokenVersion?: number;
  exp?: number;
  [key: string]: unknown;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: UserSummary;
  tokens: AuthTokens;
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

