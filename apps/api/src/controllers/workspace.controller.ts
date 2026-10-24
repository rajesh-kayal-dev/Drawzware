import type { Request, Response } from 'express';
import {
  createWorkspace,
  listWorkspacesForUser,
  findWorkspaceById,
  listWorkspaceMembers,
  createWorkspaceInvitation,
  acceptWorkspaceInvitation,
} from '../services/workspace.service';
import {
  CreateWorkspaceInput,
  CreateInvitationInput,
} from '@drawzware/contracts';

export const createWorkspaceHandler = async (req: Request, res: Response) => {
  const user = req.user!;
  const body = req.body as CreateWorkspaceInput;

  try {
    const workspace = await createWorkspace(body.name, user.id, user.email);
    return res.status(201).json(workspace);
  } catch (err: unknown) {
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create workspace.',
      details: err instanceof Error ? err.message : undefined,
    });
  }
};

export const listWorkspacesHandler = async (req: Request, res: Response) => {
  const user = req.user!;

  try {
    const workspaces = await listWorkspacesForUser(user.id);
    return res.json(workspaces);
  } catch (err: unknown) {
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to list workspaces.',
      details: err instanceof Error ? err.message : undefined,
    });
  }
};

export const getWorkspaceHandler = async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId;

  try {
    const workspace = await findWorkspaceById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Workspace not found.',
      });
    }
    return res.json(workspace);
  } catch (err: unknown) {
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve workspace.',
      details: err instanceof Error ? err.message : undefined,
    });
  }
};

export const listMembersHandler = async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId;

  try {
    const members = await listWorkspaceMembers(workspaceId);
    return res.json(members);
  } catch (err: unknown) {
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to list workspace members.',
      details: err instanceof Error ? err.message : undefined,
    });
  }
};

export const createInvitationHandler = async (req: Request, res: Response) => {
  const user = req.user!;
  const workspaceId = req.params.workspaceId;
  const body = req.body as CreateInvitationInput;

  try {
    const invitation = await createWorkspaceInvitation(
      workspaceId,
      body.email,
      body.role,
      user.id
    );
    return res.status(201).json(invitation);
  } catch (err: unknown) {
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create workspace invitation.',
      details: err instanceof Error ? err.message : undefined,
    });
  }
};

export const acceptInvitationHandler = async (req: Request, res: Response) => {
  const user = req.user!;
  const invitationId = req.params.invitationId;

  if (!user.email) {
    return res.status(400).json({
      error: 'MISSING_EMAIL',
      message: 'User email is required in auth token claims to accept invitations.',
    });
  }

  try {
    const member = await acceptWorkspaceInvitation(
      invitationId,
      user.id,
      user.email
    );
    return res.json({
      message: 'Invitation accepted successfully.',
      member,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'INVITATION_NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Invitation not found.' });
    } else if (msg === 'INVITATION_EMAIL_MISMATCH') {
      return res.status(403).json({
        error: 'EMAIL_MISMATCH',
        message: 'The email in your authentication token does not match the invitation email.',
      });
    } else if (msg === 'INVITATION_EXPIRED') {
      return res.status(410).json({ error: 'EXPIRED', message: 'This invitation has expired.' });
    } else if (msg.startsWith('INVITATION_')) {
      return res.status(409).json({
        error: 'INVALID_STATUS',
        message: `Invitation is already ${msg.replace('INVITATION_', '').toLowerCase()}.`,
      });
    } else {
      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to accept invitation.',
        details: msg,
      });
    }
  }
};
