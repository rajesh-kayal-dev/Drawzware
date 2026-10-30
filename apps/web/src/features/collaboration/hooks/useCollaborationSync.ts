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
import { getStoredAccessToken } from '../services/auth.client';

export interface UseCollaborationSyncOptions {
  projectId: string;
  cloudDiagramId?: string | null;
  enabled?: boolean;
  token?: string | null;
  wsUrl?: string;
  initialRole?: WorkspaceRole;
}

export function useCollaborationSync({
  projectId,
  cloudDiagramId,
  enabled,
  token,
  wsUrl,
  initialRole,
}: UseCollaborationSyncOptions) {
  const isLive = useCollaborationStore((s) => s.isLive);
  const myRole = useCollaborationStore((s) => s.myRole);
  const isReadOnly = useCollaborationStore((s) => s.isReadOnly);
  const currentUser = useCollaborationStore((s) => s.currentUser);
  const setMyRole = useCollaborationStore((s) => s.setMyRole);
  const setConnectionStatus = useCollaborationStore((s) => s.setConnectionStatus);
  const setUndoManager = useCollaborationStore((s) => s.setUndoManager);
  const updateFromPresence = useCollaborationStore((s) => s.updateFromPresence);
  const removeUserPresence = useCollaborationStore((s) => s.removeUserPresence);
  const setReconnectHandler = useCollaborationStore((s) => s.setReconnectHandler);

  const clientRef = useRef<CollabClient | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const isApplyingRemoteRef = useRef(false);

  // Target cloud diagram identity: only connect when an explicit cloudDiagramId is present, or in test harness with enabled: true
  const targetDiagramId = cloudDiagramId || (enabled ? projectId : null);

  // Set initial role if passed
  useEffect(() => {
    if (initialRole) {
      setMyRole(initialRole);
    }
  }, [initialRole, setMyRole]);

  // Connect & Sync lifecycle
  useEffect(() => {
    // Connect if explicitly enabled (tests) or if verified auth user has targetDiagramId
    const storedToken = token || getStoredAccessToken();
    const hasVerifiedAuth = currentUser ? currentUser.isEmailVerified : Boolean(storedToken);
    const shouldConnect = enabled ?? (Boolean(targetDiagramId) && (hasVerifiedAuth || Boolean(storedToken)));
    if (!shouldConnect || !targetDiagramId) {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
      setUndoManager(null);
      useCollaborationStore.setState({ isLive: false, connectionStatus: 'disconnected' });
      return;
    }

    if (!isLive) {
      useCollaborationStore.getState().setLive(true);
    }

    const currentCanvasState = useCanvasStore.getState();
    const doc = initYDocFromCanvas(currentCanvasState.nodes, currentCanvasState.edges, projectId);
    docRef.current = doc;

    const undoManager = createCollabUndoManager(doc);
    setUndoManager(undoManager);

    // Helper to merge remote nodes while preserving local user's current selection and dragging nodes
    const applyRemoteCanvasState = () => {
      const { nodes, edges } = extractCanvasFromYDoc(doc);
      const currentCanvas = useCanvasStore.getState();
      const currentNodes = currentCanvas.nodes;
      const currentEdges = currentCanvas.edges;

      // 1. Maintain local dragging node positions so ongoing user drags are never snapped back by remote events
      const draggingNodeMap = new Map(
        currentNodes.filter((n) => n.dragging).map((n) => [n.id, n])
      );
      const currentSelectedIds = new Set(
        currentNodes.filter((n) => n.selected).map((n) => n.id)
      );

      const mergedNodes = nodes.map((n) => {
        const localDragging = draggingNodeMap.get(n.id);
        if (localDragging) {
          return {
            ...n,
            position: localDragging.position,
            dragging: true,
            selected: localDragging.selected,
          };
        }
        return currentSelectedIds.has(n.id) ? { ...n, selected: true } : n;
      });

      // 2. Only dispatch updates to Zustand if there are meaningful position/data changes
      const hasNodesChanged =
        mergedNodes.length !== currentNodes.length ||
        mergedNodes.some((mn, i) => {
          const cn = currentNodes[i];
          if (!cn || cn.id !== mn.id) return true;
          if (cn.position.x !== mn.position.x || cn.position.y !== mn.position.y) return true;
          return JSON.stringify(cn.data) !== JSON.stringify(mn.data);
        });

      const hasEdgesChanged =
        edges.length !== currentEdges.length ||
        edges.some((me, i) => {
          const ce = currentEdges[i];
          if (!ce || ce.id !== me.id) return true;
          return ce.source !== me.source || ce.target !== me.target || JSON.stringify(ce.data) !== JSON.stringify(me.data);
        });

      if (hasNodesChanged) {
        useCanvasStore.getState().setNodes(mergedNodes);
      }
      if (hasEdgesChanged) {
        useCanvasStore.getState().setEdges(edges);
      }
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
    let dragSyncTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribeCanvas = useCanvasStore.subscribe((state, prevState) => {
      if (isApplyingRemoteRef.current) return;
      if (useCollaborationStore.getState().isReadOnly) return;
      if (state.nodes === prevState.nodes && state.edges === prevState.edges) return;

      const isAnyNodeDragging = state.nodes.some((n) => n.dragging);
      if (isAnyNodeDragging) {
        // While actively dragging, throttle synchronization to 30ms to maintain 60fps local rendering
        // while broadcasting smooth real-time movement to remote peers
        if (!dragSyncTimer) {
          dragSyncTimer = setTimeout(() => {
            dragSyncTimer = null;
            applyCanvasDiffToYDoc(doc, useCanvasStore.getState().nodes, useCanvasStore.getState().edges, 'local');
          }, 30);
        }
      } else {
        if (dragSyncTimer) {
          clearTimeout(dragSyncTimer);
          dragSyncTimer = null;
        }
        applyCanvasDiffToYDoc(doc, state.nodes, state.edges, 'local');
      }
    });

    // Create and connect CollabClient with dynamic token resolver
    const client = new CollabClient({
      diagramId: targetDiagramId,
      token: () => token || getStoredAccessToken() || null,
      wsUrl,
      role: myRole,
      onStatusChange: (status) => {
        setConnectionStatus(status);
        if (status === 'connected') {
          useCollaborationStore.setState({ savedToCloudConnectionFailed: false });
          // Handshake: exchange state vector to receive server snapshot diff
          const vectorBase64 = uint8ArrayToBase64(Y.encodeStateVector(doc));
          client.sendSyncStep1(vectorBase64);
        } else if (status === 'error') {
          if (useCollaborationStore.getState().activeDiagramId) {
            useCollaborationStore.setState({ savedToCloudConnectionFailed: true });
          }
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
    setReconnectHandler(() => clientRef.current?.reconnect());
    client.connect();

    // Auto-reconnect when browser tab regains network or focus
    const onOnlineOrFocus = () => {
      if (clientRef.current && (clientRef.current.getStatus() === 'error' || clientRef.current.getStatus() === 'disconnected')) {
        clientRef.current.reconnect();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('online', onOnlineOrFocus);
      window.addEventListener('focus', onOnlineOrFocus);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onOnlineOrFocus);
        window.removeEventListener('focus', onOnlineOrFocus);
      }
      setReconnectHandler(null);
      if (dragSyncTimer) {
        clearTimeout(dragSyncTimer);
        dragSyncTimer = null;
      }
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
    targetDiagramId,
    enabled,
    token,
    wsUrl,
    currentUser?.id,
    currentUser?.isEmailVerified,
    setConnectionStatus,
    setUndoManager,
    setReconnectHandler,
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
