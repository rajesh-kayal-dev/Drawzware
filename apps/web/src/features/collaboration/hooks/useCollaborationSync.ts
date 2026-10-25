'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { useCanvasStore } from '@/features/canvas/stores/useCanvasStore';
import { useCollaborationStore } from '../stores/useCollaborationStore';
import { CollabClient } from '../services/collab.client';
import {
  initYDocFromCanvas,
  extractCanvasFromYDoc,
  applyCanvasDiffToYDoc,
  createCollabUndoManager,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from '../utils/yjs-sync';
import type { WorkspaceRole } from '@drawzware/contracts';

export interface UseCollaborationSyncOptions {
  projectId: string;
  enabled?: boolean;
  token?: string | null;
  wsUrl?: string;
  initialRole?: WorkspaceRole;
}

export function useCollaborationSync({
  projectId,
  enabled,
  token,
  wsUrl,
  initialRole,
}: UseCollaborationSyncOptions) {
  const isLive = useCollaborationStore((s) => s.isLive);
  const myRole = useCollaborationStore((s) => s.myRole);
  const isReadOnly = useCollaborationStore((s) => s.isReadOnly);
  const setMyRole = useCollaborationStore((s) => s.setMyRole);
  const setConnectionStatus = useCollaborationStore((s) => s.setConnectionStatus);
  const setUndoManager = useCollaborationStore((s) => s.setUndoManager);
  const updateFromPresence = useCollaborationStore((s) => s.updateFromPresence);
  const removeUserPresence = useCollaborationStore((s) => s.removeUserPresence);

  const clientRef = useRef<CollabClient | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const isApplyingRemoteRef = useRef(false);

  // Set initial role if passed
  useEffect(() => {
    if (initialRole) {
      setMyRole(initialRole);
    }
  }, [initialRole, setMyRole]);

  // Connect & Sync lifecycle
  useEffect(() => {
    const shouldConnect = enabled ?? isLive;
    if (!shouldConnect || !projectId) {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
      setUndoManager(null);
      return;
    }

    const currentCanvasState = useCanvasStore.getState();
    const doc = initYDocFromCanvas(currentCanvasState.nodes, currentCanvasState.edges, projectId);
    docRef.current = doc;

    const undoManager = createCollabUndoManager(doc);
    setUndoManager(undoManager);

    // Helper to merge remote nodes while preserving local user's current selection
    const applyRemoteCanvasState = () => {
      const { nodes, edges } = extractCanvasFromYDoc(doc);
      const currentSelectedIds = new Set(
        useCanvasStore.getState().nodes.filter((n) => n.selected).map((n) => n.id)
      );
      const mergedNodes = nodes.map((n) =>
        currentSelectedIds.has(n.id) ? { ...n, selected: true } : n
      );
      useCanvasStore.getState().setNodes(mergedNodes);
      useCanvasStore.getState().setEdges(edges);
    };

    // Document update listener: sends binary diffs to server and updates canvas store on local undo/redo
    const handleDocUpdate = (updateBytes: Uint8Array, origin: unknown) => {
      if (origin === 'local' || origin === undoManager) {
        if (!useCollaborationStore.getState().isReadOnly) {
          const updateBase64 = uint8ArrayToBase64(updateBytes);
          clientRef.current?.sendSyncUpdate(updateBase64);
        }

        // When changes originate from UndoManager, update canvas store so local UI reflects undo/redo
        if (origin === undoManager) {
          isApplyingRemoteRef.current = true;
          try {
            applyRemoteCanvasState();
          } finally {
            isApplyingRemoteRef.current = false;
          }
        }
      }
    };
    doc.on('update', handleDocUpdate);

    // Canvas store subscriber: bridges React Flow node/edge changes into Yjs maps
    const unsubscribeCanvas = useCanvasStore.subscribe((state, prevState) => {
      if (isApplyingRemoteRef.current) return;
      if (useCollaborationStore.getState().isReadOnly) return;
      if (state.nodes === prevState.nodes && state.edges === prevState.edges) return;

      applyCanvasDiffToYDoc(doc, state.nodes, state.edges, 'local');
    });

    // Create and connect CollabClient with dynamic token resolver
    const client = new CollabClient({
      diagramId: projectId,
      token: () => token || (typeof window !== 'undefined' ? localStorage.getItem('drawzware_token') || 'demo-token' : 'demo-token'),
      wsUrl,
      role: myRole,
      onStatusChange: (status) => {
        setConnectionStatus(status);
        if (status === 'connected') {
          // Handshake: exchange state vector to receive server snapshot diff
          const vectorBase64 = uint8ArrayToBase64(Y.encodeStateVector(doc));
          client.sendSyncStep1(vectorBase64);
        }
      },
      onSyncStep1: (serverVectorBase64) => {
        // Bi-directional sync: encode and send any local offline edits missing on the server
        if (useCollaborationStore.getState().isReadOnly) return;
        try {
          const serverVector = base64ToUint8Array(serverVectorBase64);
          const diffForServer = Y.encodeStateAsUpdate(doc, serverVector);
          // Yjs empty diff has byteLength <= 2 (typically [0, 0])
          if (diffForServer.byteLength > 2) {
            client.sendSyncUpdate(uint8ArrayToBase64(diffForServer));
          }
        } catch {
          // Safe ignore
        }
      },
      onSyncStep2: (updateBase64) => {
        isApplyingRemoteRef.current = true;
        try {
          const updateBytes = base64ToUint8Array(updateBase64);
          Y.applyUpdate(doc, updateBytes, 'remote-init');
          applyRemoteCanvasState();
        } finally {
          isApplyingRemoteRef.current = false;
        }
      },
      onRemoteUpdate: (updateBase64) => {
        isApplyingRemoteRef.current = true;
        try {
          const updateBytes = base64ToUint8Array(updateBase64);
          Y.applyUpdate(doc, updateBytes, 'remote');
          applyRemoteCanvasState();
        } finally {
          isApplyingRemoteRef.current = false;
        }
      },
      onPresenceUpdate: (users) => {
        updateFromPresence(users);
      },
      onUserLeft: (userId) => {
        removeUserPresence(userId);
      },
      onPermissionRevoked: () => {
        setMyRole('viewer');
      },
    });

    clientRef.current = client;
    client.connect();

    return () => {
      unsubscribeCanvas();
      doc.off('update', handleDocUpdate);
      doc.destroy();
      docRef.current = null;
      setUndoManager(null);
      client.disconnect();
      clientRef.current = null;
    };
  }, [
    projectId,
    enabled,
    isLive,
    token,
    wsUrl,
    myRole,
    setConnectionStatus,
    setUndoManager,
    updateFromPresence,
    removeUserPresence,
    setMyRole,
  ]);

  const broadcastCursor = useCallback(
    (pos: { x: number; y: number } | null, selectedNodeIds: string[] = []) => {
      clientRef.current?.sendCursorMove(pos, selectedNodeIds);
    },
    []
  );

  return {
    isLive,
    myRole,
    isReadOnly,
    broadcastCursor,
  };
}
