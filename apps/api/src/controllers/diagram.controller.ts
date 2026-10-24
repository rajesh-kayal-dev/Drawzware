import type { Request, Response } from 'express';
import {
  createDiagram,
  findDiagramById,
  listDiagramsInWorkspace,
  updateDiagramMetadata,
  getDiagramSnapshot,
} from '../services/diagram.service.js';
import { findWorkspaceMember } from '../services/workspace.service.js';
import { CreateDiagramInput, UpdateDiagramInput, ImportDiagramInput, hasMinimumRole } from '@drawzware/contracts';
import { serverError } from '../middleware/error-handler.js';

export const listDiagramsHandler = async (req: Request, res: Response) => {
  try {
    const diagrams = await listDiagramsInWorkspace(req.params.workspaceId);
    return res.json(diagrams);
  } catch (err: unknown) {
    return serverError(res, 'Failed to list diagrams.', err);
  }
};

export const createDiagramHandler = async (req: Request, res: Response) => {
  const user = req.user!;
  const body = req.body as CreateDiagramInput;
  try {
    const diagram = await createDiagram(req.params.workspaceId, body.title, body.diagramType, user.id);
    return res.status(201).json(diagram);
  } catch (err: unknown) {
    return serverError(res, 'Failed to create diagram.', err);
  }
};

export const importDiagramHandler = async (req: Request, res: Response) => {
  const user = req.user!;
  const body = req.body as ImportDiagramInput;
  try {
    const title = body.title || body.project.name || 'Imported Diagram';
    const diagramType = body.project.diagramType || 'architecture';
    const diagram = await createDiagram(req.params.workspaceId, title, diagramType, user.id, body.project);
    return res.status(201).json({ message: 'Diagram imported successfully.', diagram });
  } catch (err: unknown) {
    return serverError(res, 'Failed to import local diagram.', err);
  }
};

export const getDiagramHandler = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    const diagram = await findDiagramById(req.params.diagramId);
    if (!diagram) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Diagram not found.' });
    }

    const member = await findWorkspaceMember(diagram.workspaceId, user.id);
    if (!member) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'You do not have access to this diagram.' });
    }

    const snapshot = await getDiagramSnapshot(req.params.diagramId);
    return res.json({ ...diagram, snapshot: snapshot || null });
  } catch (err: unknown) {
    return serverError(res, 'Failed to retrieve diagram.', err);
  }
};

export const updateDiagramHandler = async (req: Request, res: Response) => {
  const user = req.user!;
  const body = req.body as UpdateDiagramInput;
  try {
    const diagram = await findDiagramById(req.params.diagramId);
    if (!diagram) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Diagram not found.' });
    }

    const member = await findWorkspaceMember(diagram.workspaceId, user.id);
    if (!member) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'You do not have access to this workspace.' });
    }

    if (!hasMinimumRole(member.role, 'editor')) {
      return res.status(403).json({
        error: 'INSUFFICIENT_PERMISSIONS',
        message: "Users with 'viewer' role cannot modify diagram metadata.",
      });
    }

    const updated = await updateDiagramMetadata(req.params.diagramId, {
      title: body.title,
      diagramType: body.diagramType,
    });

    return res.json(updated);
  } catch (err: unknown) {
    return serverError(res, 'Failed to update diagram.', err);
  }
};
