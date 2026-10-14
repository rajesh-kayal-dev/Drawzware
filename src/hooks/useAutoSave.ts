'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { useProjectStore } from '@/stores/useProjectStore';
import type { Project, SystemNode, SystemEdge, DiagramType } from '@/types';
import type { Viewport } from '@xyflow/react';

export const DEBOUNCE_MS = 500;
export const RETRY_MS = 3000;

export interface CanvasSnapshot {
  version: number;
  projectId: string;
  nodes: SystemNode[];
  edges: SystemEdge[];
  viewport: Viewport;
  diagramType: DiagramType;
  diagramData: Record<DiagramType, { nodes: SystemNode[]; edges: SystemEdge[] }>;
}

/**
 * Asynchronously persists the canvas snapshot to disk or web storage.
 * Returns true if confirmed saved, false if storage rejected or failed.
 */
export async function persistCanvasSnapshot(snapshot: CanvasSnapshot): Promise<boolean> {
  const projectStore = useProjectStore.getState();
  const existing = projectStore.projects.find((p) => p.id === snapshot.projectId);
  const updatedDiagramData = {
    ...snapshot.diagramData,
    [snapshot.diagramType]: { nodes: snapshot.nodes, edges: snapshot.edges },
  };

  const projectToPersist: Project = {
    ...(existing || {
      id: snapshot.projectId,
      name: 'Untitled Project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    viewport: snapshot.viewport,
    diagramType: snapshot.diagramType,
    diagramData: updatedDiagramData,
    updatedAt: new Date().toISOString(),
  };

  return projectStore.saveProjectAsync(projectToPersist);
}

/**
 * Tracked asynchronous autosave hook:
 * - 500ms debounce
 * - Sequential FIFO execution (no overlapping or out-of-order writes)
 * - Actual persistence status tracking ('saving', 'saved', 'error')
 * - Automatic retry every 3s on persistence failure
 * - App close / route change pending flush and beforeunload protection
 */
export function useAutoSave() {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const viewport = useCanvasStore((s) => s.viewport);
  const projectId = useCanvasStore((s) => s.projectId);
  const diagramType = useCanvasStore((s) => s.diagramType);
  const diagramData = useCanvasStore((s) => s.diagramData);

  const versionRef = useRef<number>(0);
  const lastSavedVersionRef = useRef<number>(0);
  const latestSnapshotRef = useRef<CanvasSnapshot | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentProjectIdRef = useRef<string | null>(null);
  const executeSaveRef = useRef<() => Promise<boolean>>(async () => true);

  const executeSave = useCallback(async (): Promise<boolean> => {
    if (isSavingRef.current) return true;
    const initialSnapshot = latestSnapshotRef.current;
    if (!initialSnapshot) return true;

    if (initialSnapshot.version <= lastSavedVersionRef.current) {
      useCanvasStore.getState().setSaveStatus('saved');
      return true;
    }

    isSavingRef.current = true;
    useCanvasStore.getState().setSaveStatus('saving');

    try {
      // Loop while there are newer unpersisted snapshots
      while (
        latestSnapshotRef.current &&
        latestSnapshotRef.current.version > lastSavedVersionRef.current
      ) {
        const snapshotToSave = latestSnapshotRef.current;
        const success = await persistCanvasSnapshot(snapshotToSave);

        if (success) {
          if (snapshotToSave.version > lastSavedVersionRef.current) {
            lastSavedVersionRef.current = snapshotToSave.version;
          }
        } else {
          useCanvasStore.getState().setSaveStatus('error');
          if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
          retryTimerRef.current = setTimeout(() => {
            executeSaveRef.current();
          }, RETRY_MS);
          return false;
        }
      }

      useCanvasStore.getState().setSaveStatus('saved');
      return true;
    } catch (err) {
      console.error('[useAutoSave] Persistence exception:', err);
      useCanvasStore.getState().setSaveStatus('error');
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        executeSaveRef.current();
      }, RETRY_MS);
      return false;
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  useEffect(() => {
    executeSaveRef.current = executeSave;
  }, [executeSave]);

  // Register close handshake handler when running in Electron desktop
  useEffect(() => {
    if (typeof window === 'undefined' || !window.desktopApi?.window) return;

    const unregister = window.desktopApi.window.registerCloseHandler(async () => {
      // Cancel pending debounce timer so flush happens immediately
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      const hasUnsaved =
        isSavingRef.current ||
        (latestSnapshotRef.current !== null &&
          latestSnapshotRef.current.version > lastSavedVersionRef.current);

      if (!hasUnsaved) {
        return { canClose: true, hasUnsaved: false };
      }

      // Flush and await storage result
      const success = await executeSave();
      if (success) {
        return { canClose: true, hasUnsaved: true };
      } else {
        return {
          canClose: false,
          hasUnsaved: true,
          error: 'Failed to write project changes to storage.',
        };
      }
    });

    return () => {
      unregister();
    };
  }, [executeSave]);

  useEffect(() => {
    if (!projectId) return;

    // Detect project switch or initial mount for this project
    if (currentProjectIdRef.current !== projectId) {
      currentProjectIdRef.current = projectId;
      versionRef.current = 1;
      lastSavedVersionRef.current = 1;
      latestSnapshotRef.current = {
        version: 1,
        projectId,
        nodes,
        edges,
        viewport,
        diagramType,
        diagramData,
      };
      useCanvasStore.getState().setSaveStatus('saved');
      return;
    }

    // New edit detected
    versionRef.current += 1;
    const currentVersion = versionRef.current;
    latestSnapshotRef.current = {
      version: currentVersion,
      projectId,
      nodes,
      edges,
      viewport,
      diagramType,
      diagramData,
    };

    const { saveStatus, setSaveStatus } = useCanvasStore.getState();
    if (saveStatus !== 'error') {
      setSaveStatus('saving');
    }

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    // If an async save is not currently in flight, schedule debounced save
    if (!isSavingRef.current) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(executeSave, DEBOUNCE_MS);
    }
  }, [nodes, edges, viewport, projectId, diagramType, diagramData, executeSave]);

  // Flush pending save on unmount (e.g. leaving canvas route)
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (
        latestSnapshotRef.current &&
        latestSnapshotRef.current.version > lastSavedVersionRef.current
      ) {
        executeSave();
      }
    };
  }, [executeSave]);

  // Handle window beforeunload: flush pending save and prevent silent data loss
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (
        latestSnapshotRef.current &&
        latestSnapshotRef.current.version > lastSavedVersionRef.current
      ) {
        executeSave();
      }
      // If still in the process of saving, alert the browser to prevent immediate destruction
      if (
        isSavingRef.current ||
        (latestSnapshotRef.current && latestSnapshotRef.current.version > lastSavedVersionRef.current)
      ) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [executeSave]);
}
