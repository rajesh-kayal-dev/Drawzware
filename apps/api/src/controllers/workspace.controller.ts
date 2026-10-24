import type { Request, Response } from 'express';
import {
  createWorkspace,
  listWorkspacesForUser,
  findWorkspaceById,
  listWorkspaceMembers,
  createWorkspaceInvitation,
  acceptWorkspaceInvitation,
} from '../services/workspace.service.js';
import { CreateWorkspaceInput, CreateInvitationInput } from '@drawzware/contracts';
import { serverError } from '../middleware/error-handler.js';

export const createWorkspaceHandler = async (req: Request, res: Response) => {
  const user = req.user!;
  const body = req.body as CreateWorkspaceInput;
  try {
    const workspace = await createWorkspace(body.name, user.id, user.email);
    return res.status(201).json(workspace);
  } catch (err: unknown) {
    return serverError(res, 'Failed to create workspace.', err);
  }
};

export const listWorkspacesHandler = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    const workspaces = await listWorkspacesForUser(user.id);
    return res.json(workspaces);
  } catch (err: unknown) {
    return serverError(res, 'Failed to list workspaces.', err);
  }
};

export const getWorkspaceHandler = async (req: Request, res: Response) => {
  try {
    const workspace = await findWorkspaceById(req.params.workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Workspace not found.' });
    }
    return res.json(workspace);
  } catch (err: unknown) {
    return serverError(res, 'Failed to retrieve workspace.', err);
  }
};

export const listMembersHandler = async (req: Request, res: Response) => {
  try {
    const members = await listWorkspaceMembers(req.params.workspaceId);
    return res.json(members);
  } catch (err: unknown) {
    return serverError(res, 'Failed to list workspace members.', err);
  }
};

export const createInvitationHandler = async (req: Request, res: Response) => {
  const user = req.user!;
  const body = req.body as CreateInvitationInput;
  try {
    const invitation = await createWorkspaceInvitation(req.params.workspaceId, body.email, body.role, user.id);
    return res.status(201).json(invitation);
  } catch (err: unknown) {
    return serverError(res, 'Failed to create workspace invitation.', err);
  }
};

export const acceptInvitationHandler = async (req: Request, res: Response) => {
  const user = req.user!;
  if (!user.email) {
    return res.status(400).json({
      error: 'MISSING_EMAIL',
      message: 'User email is required in auth token claims to accept invitations.',
    });
  }

  try {
    const member = await acceptWorkspaceInvitation(req.params.invitationId, user.id, user.email);
    return res.json({ message: 'Invitation accepted successfully.', member });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'INVITATION_NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Invitation not found.' });
    }
    if (msg === 'INVITATION_EMAIL_MISMATCH') {
      return res.status(403).json({ error: 'EMAIL_MISMATCH', message: 'The email in your authentication token does not match the invitation email.' });
    }
    if (msg === 'INVITATION_EXPIRED') {
      return res.status(410).json({ error: 'EXPIRED', message: 'This invitation has expired.' });
    }
    if (msg.startsWith('INVITATION_')) {
      return res.status(409).json({ error: 'INVALID_STATUS', message: `Invitation is already ${msg.replace('INVITATION_', '').toLowerCase()}.` });
    }
    return serverError(res, 'Failed to accept invitation.', err);
  }
};
