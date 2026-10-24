import { AuthenticatedUser, WorkspaceRole } from '@drawzware/contracts';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      workspaceRole?: WorkspaceRole;
    }
  }
}

export {};
