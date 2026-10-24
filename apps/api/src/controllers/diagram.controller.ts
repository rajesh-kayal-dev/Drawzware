import type { Request, Response } from 'express';
import {
  createDiagram,
  findDiagramById,
  listDiagramsInWorkspace,
  updateDiagramMetadata,
  getDiagramSnapshot,
} from '../services/diagram.service';
import { findWorkspaceMember } from '../services/workspace.service';
import {
  CreateDiagramInput,
  UpdateDiagramInput,
  ImportDiagramInput,
  hasMinimumRole,
} from '@drawzware/contracts';

export const listDiagramsHandler = async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId;

  try {
    const diagrams = await listDiagramsInWorkspace(workspaceId);
    return res.json(diagrams);
  } catch (err: unknown) {
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to list diagrams.',
      details: err instanceof Error ? err.message : undefined,
    });
  }
};

export const createDiagramHandler = async (req: Request, res: Response) => {
  const user = req.user!;
  const workspaceId = req.params.workspaceId;
  const body = req.body as CreateDiagramInput;

  try {
    const diagram = await createDiagram(
      workspaceId,
      body.title,
      body.diagramType,
      user.id
    );
    return res.status(201).json(diagram);
  } catch (err: unknown) {
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create diagram.',
      details: err instanceof Error ? err.message : undefined,
    });
  }
};

export const importDiagramHandler = async (req: Request, res: Response) => {
  const user = req.user!;
  const workspaceId = req.params.workspaceId;
  const body = req.body as ImportDiagramInput;

  try {
    const title = body.title || body.project.name || 'Imported Diagram';
    const diagramType = body.project.diagramType || 'architecture';

    const diagram = await createDiagram(
      workspaceId,
      title,
      diagramType,
      user.id,
      body.project
    );

    return res.status(201).json({
      message: 'Diagram imported successfully.',
      diagram,
    });
  } catch (err: unknown) {
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to import local diagram.',
      details: err instanceof Error ? err.message : undefined,
    });
  }
};

export const getDiagramHandler = async (req: Request, res: Response) => {
  const user = req.user!;
  const diagramId = req.params.diagramId;

  try {
    const diagram = await findDiagramById(diagramId);
    if (!diagram) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Diagram not found.' });
    }

    const member = await findWorkspaceMember(diagram.workspaceId, user.id);
    if (!member) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'You do not have access to this diagram.' });
    }

    const snapshot = await getDiagramSnapshot(diagramId);

    return res.json({
      ...diagram,
      snapshot: snapshot || null,
    });
  } catch (err: unknown) {
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve diagram.',
      details: err instanceof Error ? err.message : undefined,
    });
  }
};

export const updateDiagramHandler = async (req: Request, res: Response) => {
  const user = req.user!;
  const diagramId = req.params.diagramId;
  const body = req.body as UpdateDiagramInput;

  try {
    const diagram = await findDiagramById(diagramId);
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

    const updated = await updateDiagramMetadata(diagramId, {
      title: body.title,
      diagramType: body.diagramType,
    });

    return res.json(updated);
  } catch (err: unknown) {
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to update diagram.',
      details: err instanceof Error ? err.message : undefined,
    });
  }
};
