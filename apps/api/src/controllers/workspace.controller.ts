import { Request, Response } from 'express';
import { WorkspaceRepository } from '../repositories/workspace.repository';
import {
  CreateWorkspaceInput,
  CreateInvitationInput,
} from '@drawzware/contracts';

export class WorkspaceController {
  private _workspaceRepo?: WorkspaceRepository;

  constructor(workspaceRepo?: WorkspaceRepository) {
    this._workspaceRepo = workspaceRepo;
  }

  get workspaceRepo(): WorkspaceRepository {
    if (!this._workspaceRepo) {
      this._workspaceRepo = new WorkspaceRepository();
    }
    return this._workspaceRepo;
  }

  createWorkspace = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const body = req.body as CreateWorkspaceInput;

    try {
      const workspace = await this.workspaceRepo.createWorkspace(
        body.name,
        user.id,
        user.email
      );
      res.status(201).json(workspace);
    } catch (err: unknown) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to create workspace.',
        details: err instanceof Error ? err.message : undefined,
      });
    }
  };

  listWorkspaces = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;

    try {
      const workspaces = await this.workspaceRepo.listWorkspacesForUser(user.id);
      res.json(workspaces);
    } catch (err: unknown) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to list workspaces.',
        details: err instanceof Error ? err.message : undefined,
      });
    }
  };

  getWorkspace = async (req: Request, res: Response): Promise<void> => {
    const workspaceId = req.params.workspaceId;

    try {
      const workspace = await this.workspaceRepo.findWorkspaceById(workspaceId);
      if (!workspace) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Workspace not found.',
        });
        return;
      }
      res.json(workspace);
    } catch (err: unknown) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve workspace.',
        details: err instanceof Error ? err.message : undefined,
      });
    }
  };

  listMembers = async (req: Request, res: Response): Promise<void> => {
    const workspaceId = req.params.workspaceId;

    try {
      const members = await this.workspaceRepo.listMembers(workspaceId);
      res.json(members);
    } catch (err: unknown) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to list workspace members.',
        details: err instanceof Error ? err.message : undefined,
      });
    }
  };

  createInvitation = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const workspaceId = req.params.workspaceId;
    const body = req.body as CreateInvitationInput;

    try {
      const invitation = await this.workspaceRepo.createInvitation(
        workspaceId,
        body.email,
        body.role,
        user.id
      );
      res.status(201).json(invitation);
    } catch (err: unknown) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to create workspace invitation.',
        details: err instanceof Error ? err.message : undefined,
      });
    }
  };

  acceptInvitation = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const invitationId = req.params.invitationId;

    if (!user.email) {
      res.status(400).json({
        error: 'MISSING_EMAIL',
        message: 'User email is required in auth token claims to accept invitations.',
      });
      return;
    }

    try {
      const member = await this.workspaceRepo.acceptInvitation(
        invitationId,
        user.id,
        user.email
      );
      res.json({
        message: 'Invitation accepted successfully.',
        member,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'INVITATION_NOT_FOUND') {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Invitation not found.' });
      } else if (msg === 'INVITATION_EMAIL_MISMATCH') {
        res.status(403).json({
          error: 'EMAIL_MISMATCH',
          message: 'The email in your authentication token does not match the invitation email.',
        });
      } else if (msg === 'INVITATION_EXPIRED') {
        res.status(410).json({ error: 'EXPIRED', message: 'This invitation has expired.' });
      } else if (msg.startsWith('INVITATION_')) {
        res.status(409).json({ error: 'INVALID_STATUS', message: `Invitation is already ${msg.replace('INVITATION_', '').toLowerCase()}.` });
      } else {
        res.status(500).json({
          error: 'INTERNAL_ERROR',
          message: 'Failed to accept invitation.',
          details: msg,
        });
      }
    }
  };
}
