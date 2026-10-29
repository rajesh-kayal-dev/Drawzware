import type {
  RegisterInput,
  LoginInput,
  VerifyEmailInput,
  ResendVerificationInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  RefreshTokenInput,
  AuthTokens,
  InvitationPreview,
  WorkspaceInvitation,
  WorkspaceMember,
  Project,
  Workspace,
  DiagramMetadata,
  CreateWorkspaceInput,
  ImportDiagramInput,
} from '@drawzware/contracts';

const ACCESS_TOKEN_KEY = 'drawzware_access_token';
const REFRESH_TOKEN_KEY = 'drawzware_refresh_token';

export function getApiBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const isDev = window.location.port === '3000' || window.location.port === '3001';
    return isDev ? 'http://localhost:5000' : '';
  }
  return 'http://localhost:5000';
}

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem('drawzware_token');
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredTokens(tokens: { accessToken: string; refreshToken?: string }): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem('drawzware_token', tokens.accessToken);
  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

export function clearStoredTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem('drawzware_token');
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export interface ClientUserSummary {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
}

export interface ClientAuthResult {
  message?: string;
  user: ClientUserSummary;
  tokens: AuthTokens;
  emailDelivery?: 'sent' | 'fallback' | 'failed';
  alreadyVerified?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Robust JSON fetch wrapper with automatic token injection and 401 token refresh retry.
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retryOnUnauthorized = true
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const token = getStoredAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Token Expiration with Automatic Refresh
  if (response.status === 401 && retryOnUnauthorized) {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      const refreshed = await authClient.refreshSession(refreshToken);
      if (refreshed) {
        // Retry the original request with new access token
        return apiFetch<T>(endpoint, options, false);
      }
    }
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    let errorMsg =
      (typeof data?.message === 'string' && data.message) ||
      (typeof data?.error === 'string' && data.error) ||
      `HTTP ${response.status} Error`;
    if (response.status === 401 && (errorMsg.includes('Authorization header') || errorMsg.includes('Bearer token required'))) {
      errorMsg = 'Authentication required. Please sign in.';
    }
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}

export const authClient = {
  async register(input: RegisterInput): Promise<ClientAuthResult> {
    const result = await apiFetch<ClientAuthResult>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    if (result.tokens) {
      setStoredTokens(result.tokens);
    }
    return result;
  },

  async login(input: LoginInput): Promise<ClientAuthResult> {
    const result = await apiFetch<{
      message: string;
      user: ClientUserSummary;
      tokens: AuthTokens;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    if (result.tokens) {
      setStoredTokens(result.tokens);
    }
    return result;
  },

  async verifyEmail(input: VerifyEmailInput): Promise<{
    success: boolean;
    message: string;
    user?: ClientUserSummary;
    tokens?: AuthTokens;
    alreadyVerified?: boolean;
  }> {
    const res = await apiFetch<{
      success: boolean;
      message: string;
      user?: ClientUserSummary;
      tokens?: AuthTokens;
      alreadyVerified?: boolean;
    }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (res.tokens) {
      setStoredTokens(res.tokens);
    }
    return res;
  },

  async resendVerification(input: ResendVerificationInput): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async forgotPassword(input: ForgotPasswordInput): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async resetPassword(input: ResetPasswordInput): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async refreshSession(refreshToken: string): Promise<AuthTokens | null> {
    try {
      const payload: RefreshTokenInput = { refreshToken };
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        clearStoredTokens();
        return null;
      }

      const data = await response.json();
      if (data.tokens) {
        setStoredTokens(data.tokens);
        return data.tokens;
      }
      return null;
    } catch {
      clearStoredTokens();
      return null;
    }
  },

  async logout(): Promise<void> {
    const refreshToken = getStoredRefreshToken();
    try {
      await apiFetch('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }, false);
    } catch {
      // Safe ignore
    } finally {
      clearStoredTokens();
    }
  },

  async logoutAll(): Promise<void> {
    try {
      await apiFetch('/api/auth/logout-all', { method: 'POST' }, false);
    } catch {
      // Safe ignore
    } finally {
      clearStoredTokens();
    }
  },

  async getMe(): Promise<ClientUserSummary | null> {
    const token = getStoredAccessToken();
    if (!token) return null;

    try {
      const data = await apiFetch<{ user: ClientUserSummary }>('/api/auth/me');
      return data.user;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearStoredTokens();
      }
      return null;
    }
  },

  async updateProfile(payload: { name: string }): Promise<{ user: ClientUserSummary; message: string }> {
    return apiFetch<{ user: ClientUserSummary; message: string }>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async getInvitationPreview(invitationId: string): Promise<InvitationPreview> {
    return apiFetch<InvitationPreview>(`/api/invitations/${invitationId}`, {}, false);
  },

  async acceptInvitation(invitationId: string): Promise<WorkspaceMember & { canvasUrl?: string }> {
    const res = await apiFetch<{ message: string; member: WorkspaceMember; canvasUrl?: string; role?: string }>(
      `/api/invitations/${invitationId}/accept`,
      { method: 'POST' }
    );
    return { ...res.member, canvasUrl: res.canvasUrl, role: (res.role as WorkspaceMember['role']) || res.member.role };
  },

  async invitationSignup(
    invitationId: string,
    password: string
  ): Promise<{
    message: string;
    user: ClientUserSummary;
    tokens: AuthTokens;
    token: string;
    workspaceId: string;
    role: string;
    canvasUrl: string;
  }> {
    const res = await apiFetch<{
      message: string;
      user: ClientUserSummary;
      tokens: AuthTokens;
      token: string;
      workspaceId: string;
      role: string;
      canvasUrl: string;
    }>(`/api/invitations/${invitationId}/signup`, {
      method: 'POST',
      body: JSON.stringify({ invitationId, password }),
    }, false);

    if (res.tokens) {
      setStoredTokens(res.tokens);
    }
    return res;
  },

  async sendWorkspaceInvitation(
    workspaceId: string,
    email: string,
    role: 'editor' | 'viewer',
    returnUrl?: string,
    canvasUrl?: string,
    diagramId?: string
  ): Promise<WorkspaceInvitation> {
    return apiFetch<WorkspaceInvitation>(`/api/workspaces/${workspaceId}/invitations`, {
      method: 'POST',
      body: JSON.stringify({ email, role, returnUrl, canvasUrl, diagramId }),
    });
  },

  async listWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
    return apiFetch<WorkspaceInvitation[]>(`/api/workspaces/${workspaceId}/invitations`);
  },

  async revokeWorkspaceInvitation(
    workspaceId: string,
    invitationId: string
  ): Promise<WorkspaceInvitation> {
    const res = await apiFetch<{ message: string; invitation: WorkspaceInvitation }>(
      `/api/workspaces/${workspaceId}/invitations/${invitationId}/revoke`,
      { method: 'POST' }
    );
    return res.invitation;
  },

  async listWorkspaces(): Promise<Array<Workspace & { role?: string }>> {
    return apiFetch<Array<Workspace & { role?: string }>>('/api/workspaces');
  },

  async createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
    return apiFetch<Workspace>('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async importDiagram(
    workspaceId: string,
    project: Project,
    title?: string
  ): Promise<{ message: string; diagram: DiagramMetadata }> {
    const payload: ImportDiagramInput = {
      project,
      title: title || project.name || 'Untitled Diagram',
    };
    return apiFetch<{ message: string; diagram: DiagramMetadata }>(
      `/api/workspaces/${workspaceId}/diagrams/import`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  async getDiagram(diagramId: string): Promise<DiagramMetadata & { snapshot?: Project | null }> {
    return apiFetch<DiagramMetadata & { snapshot?: Project | null }>(`/api/diagrams/${diagramId}`);
  },

  async getDiagramSnapshot(diagramId: string): Promise<Project | null> {
    const res = await apiFetch<{ snapshot: Project | null }>(`/api/diagrams/${diagramId}/snapshot`);
    return res.snapshot || null;
  },
};
