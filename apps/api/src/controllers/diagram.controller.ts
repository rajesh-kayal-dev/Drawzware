import { Request, Response } from 'express';
import { DiagramRepository } from '../repositories/diagram.repository';
import { WorkspaceRepository } from '../repositories/workspace.repository';
import {
  CreateDiagramInput,
  UpdateDiagramInput,
  ImportDiagramInput,
  hasMinimumRole,
} from '@drawzware/contracts';

export class DiagramController {
  private _diagramRepo?: DiagramRepository;
  private _workspaceRepo?: WorkspaceRepository;

  constructor(
    diagramRepo?: DiagramRepository,
    workspaceRepo?: WorkspaceRepository
  ) {
    this._diagramRepo = diagramRepo;
    this._workspaceRepo = workspaceRepo;
  }

  get diagramRepo(): DiagramRepository {
    if (!this._diagramRepo) {
      this._diagramRepo = new DiagramRepository();
    }
    return this._diagramRepo;
  }

  get workspaceRepo(): WorkspaceRepository {
    if (!this._workspaceRepo) {
      this._workspaceRepo = new WorkspaceRepository();
    }
    return this._workspaceRepo;
  }

  listDiagrams = async (req: Request, res: Response): Promise<void> => {
    const workspaceId = req.params.workspaceId;

    try {
      const diagrams = await this.diagramRepo.listDiagramsInWorkspace(workspaceId);
      res.json(diagrams);
    } catch (err: unknown) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to list diagrams.',
        details: err instanceof Error ? err.message : undefined,
      });
    }
  };

  createDiagram = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const workspaceId = req.params.workspaceId;
    const body = req.body as CreateDiagramInput;

    try {
      const diagram = await this.diagramRepo.createDiagram(
        workspaceId,
        body.title,
        body.diagramType,
        user.id
      );
      res.status(201).json(diagram);
    } catch (err: unknown) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to create diagram.',
        details: err instanceof Error ? err.message : undefined,
      });
    }
  };

  importDiagram = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const workspaceId = req.params.workspaceId;
    const body = req.body as ImportDiagramInput;

    try {
      const title = body.title || body.project.name || 'Imported Diagram';
      const diagramType = body.project.diagramType || 'architecture';

      // Creates a new diagram metadata record and persists the initial snapshot
      // Explicitly imported: creates a cloud copy without altering the local diagram
      const diagram = await this.diagramRepo.createDiagram(
        workspaceId,
        title,
        diagramType,
        user.id,
        body.project
      );

      res.status(201).json({
        message: 'Diagram imported successfully.',
        diagram,
      });
    } catch (err: unknown) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to import local diagram.',
        details: err instanceof Error ? err.message : undefined,
      });
    }
  };

  getDiagram = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const diagramId = req.params.diagramId;

    try {
      const diagram = await this.diagramRepo.findDiagramById(diagramId);
      if (!diagram) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Diagram not found.' });
        return;
      }

      // Check membership in the diagram's workspace
      const member = await this.workspaceRepo.findMember(diagram.workspaceId, user.id);
      if (!member) {
        res.status(403).json({ error: 'FORBIDDEN', message: 'You do not have access to this diagram.' });
        return;
      }

      const snapshot = await this.diagramRepo.getDiagramSnapshot(diagramId);

      res.json({
        ...diagram,
        snapshot: snapshot || null,
      });
    } catch (err: unknown) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve diagram.',
        details: err instanceof Error ? err.message : undefined,
      });
    }
  };

  updateDiagram = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const diagramId = req.params.diagramId;
    const body = req.body as UpdateDiagramInput;

    try {
      const diagram = await this.diagramRepo.findDiagramById(diagramId);
      if (!diagram) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Diagram not found.' });
        return;
      }

      // Check that user is a member with at least 'editor' role
      const member = await this.workspaceRepo.findMember(diagram.workspaceId, user.id);
      if (!member) {
        res.status(403).json({ error: 'FORBIDDEN', message: 'You do not have access to this workspace.' });
        return;
      }

      if (!hasMinimumRole(member.role, 'editor')) {
        res.status(403).json({
          error: 'INSUFFICIENT_PERMISSIONS',
          message: "Users with 'viewer' role cannot modify diagram metadata.",
        });
        return;
      }

      const updated = await this.diagramRepo.updateDiagramMetadata(diagramId, {
        title: body.title,
        diagramType: body.diagramType,
      });

      res.json(updated);
    } catch (err: unknown) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to update diagram.',
        details: err instanceof Error ? err.message : undefined,
      });
    }
  };
}
