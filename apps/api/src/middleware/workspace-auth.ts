import { Request, Response, NextFunction } from 'express';
import { WorkspaceRole, hasMinimumRole } from '@drawzware/contracts';
import { findWorkspaceMember } from '../services/workspace.service';

export interface WorkspaceAuthRequest extends Request {
  workspaceRole?: WorkspaceRole;
}

export function requireWorkspaceRole(minRole: WorkspaceRole) {
  return async (req: WorkspaceAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required before checking workspace permissions.',
      });
      return;
    }

    const workspaceId = req.params.workspaceId;
    if (!workspaceId) {
      res.status(400).json({
        error: 'INVALID_WORKSPACE_ID',
        message: 'Workspace ID parameter is required.',
      });
      return;
    }

    try {
      const member = await findWorkspaceMember(workspaceId, user.id);
      if (!member) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'You are not a member of this workspace.',
        });
        return;
      }

      if (!hasMinimumRole(member.role, minRole)) {
        res.status(403).json({
          error: 'INSUFFICIENT_PERMISSIONS',
          message: `This action requires at least '${minRole}' role. Your current role is '${member.role}'.`,
        });
        return;
      }

      req.workspaceRole = member.role;
      next();
    } catch (err: unknown) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to verify workspace membership.',
        details: err instanceof Error ? err.message : undefined,
      });
    }
  };
}
