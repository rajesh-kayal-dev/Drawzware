import { DatabasePool } from '../db/interface';
import { getDbPool } from '../db/pool';
import {
  DiagramMetadata,
  DiagramType,
  Project,
} from '@drawzware/contracts';

interface DiagramDbRow {
  id: string;
  workspace_id: string;
  title: string;
  diagram_type: DiagramType;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface SnapshotDbRow {
  diagram_id: string;
  state: Project;
  version: number;
  updated_at: string;
}

export class DiagramRepository {
  private pool: DatabasePool;

  constructor(pool?: DatabasePool) {
    this.pool = pool || getDbPool();
  }

  async createDiagram(
    workspaceId: string,
    title: string,
    diagramType: DiagramType,
    createdBy: string,
    initialProjectState?: Project
  ): Promise<DiagramMetadata> {
    const res = await this.pool.query<DiagramDbRow>(
      `INSERT INTO diagrams (workspace_id, title, diagram_type, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, workspace_id, title, diagram_type, created_by, created_at, updated_at`,
      [workspaceId, title, diagramType, createdBy]
    );

    const row = res.rows[0];

    // If initial project snapshot was provided (e.g. from explicit import of local project)
    if (initialProjectState) {
      await this.pool.query(
        `INSERT INTO diagram_snapshots (diagram_id, state, version)
         VALUES ($1, $2, 1)`,
        [row.id, JSON.stringify(initialProjectState)]
      );
    }

    return {
      id: row.id,
      workspaceId: row.workspace_id,
      title: row.title,
      diagramType: row.diagram_type,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findDiagramById(id: string): Promise<DiagramMetadata | null> {
    const res = await this.pool.query<DiagramDbRow>(
      `SELECT id, workspace_id, title, diagram_type, created_by, created_at, updated_at
       FROM diagrams
       WHERE id = $1`,
      [id]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      title: row.title,
      diagramType: row.diagram_type,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listDiagramsInWorkspace(workspaceId: string): Promise<DiagramMetadata[]> {
    const res = await this.pool.query<DiagramDbRow>(
      `SELECT id, workspace_id, title, diagram_type, created_by, created_at, updated_at
       FROM diagrams
       WHERE workspace_id = $1
       ORDER BY updated_at DESC`,
      [workspaceId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      title: row.title,
      diagramType: row.diagram_type,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async updateDiagramMetadata(
    id: string,
    updates: { title?: string; diagramType?: DiagramType }
  ): Promise<DiagramMetadata | null> {
    const fields: string[] = [];
    const values: unknown[] = [id];
    let idx = 2;

    if (updates.title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(updates.title);
    }
    if (updates.diagramType !== undefined) {
      fields.push(`diagram_type = $${idx++}`);
      values.push(updates.diagramType);
    }

    if (fields.length === 0) {
      return this.findDiagramById(id);
    }

    fields.push(`updated_at = NOW()`);

    const res = await this.pool.query<DiagramDbRow>(
      `UPDATE diagrams
       SET ${fields.join(', ')}
       WHERE id = $1
       RETURNING id, workspace_id, title, diagram_type, created_by, created_at, updated_at`,
      values
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      title: row.title,
      diagramType: row.diagram_type,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getDiagramSnapshot(diagramId: string): Promise<Project | null> {
    const res = await this.pool.query<SnapshotDbRow>(
      `SELECT diagram_id, state, version, updated_at
       FROM diagram_snapshots
       WHERE diagram_id = $1`,
      [diagramId]
    );

    if (res.rows.length === 0) return null;
    const state = res.rows[0].state;
    return typeof state === 'string' ? JSON.parse(state) : state;
  }
}
