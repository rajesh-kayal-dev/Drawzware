'use client';

import { useState } from 'react';
import { Plus, Trash2, Mail, Shield, Check, Copy, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { toast } from '@/stores/useToastStore';
import { useCollaborationStore } from '../stores/useCollaborationStore';
import { useCanvasStore } from '@/features/canvas/stores/useCanvasStore';
import { useProjectStore } from '@/features/projects/stores/useProjectStore';
import { authClient } from '../services/auth.client';
import type { CollaboratorRole } from '../types/collaboration.types';

interface InviteRow {
  id: string;
  email: string;
  role: CollaboratorRole;
}

export function InvitePeopleDialog() {
  const open = useCollaborationStore((s) => s.inviteModalOpen);
  const setOpen = useCollaborationStore((s) => s.setInviteModalOpen);
  const activeTab = useCollaborationStore((s) => s.inviteActiveTab);
  const collaborators = useCollaborationStore((s) => s.collaborators);
  const addCollaborator = useCollaborationStore((s) => s.addCollaborator);
  const updateCollaboratorRole = useCollaborationStore((s) => s.updateCollaboratorRole);
  const removeCollaborator = useCollaborationStore((s) => s.removeCollaborator);
  const setInvitationAcceptModalOpen = useCollaborationStore((s) => s.setInvitationAcceptModalOpen);
  const currentUser = useCollaborationStore((s) => s.currentUser);
  const setAuthModalOpen = useCollaborationStore((s) => s.setAuthModalOpen);

  const [tab, setTab] = useState<'invite' | 'manage'>(activeTab);
  const [inviteRows, setInviteRows] = useState<InviteRow[]>([
    { id: '1', email: '', role: 'editor' },
  ]);
  const [message, setMessage] = useState('Hey! Join me on this diagram.');
  const [isSending, setIsSending] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync internal tab if opened with specific tab
  if (activeTab !== tab && open) {
    setTab(activeTab);
  }

  const handleAddRow = () => {
    setInviteRows((rows) => [
      ...rows,
      { id: String(Date.now()), email: '', role: 'editor' },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (inviteRows.length <= 1) return;
    setInviteRows((rows) => rows.filter((r) => r.id !== id));
  };

  const handleUpdateRowEmail = (id: string, val: string) => {
    setInviteRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, email: val } : r))
    );
  };

  const handleUpdateRowRole = (id: string, role: CollaboratorRole) => {
    setInviteRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, role } : r))
    );
  };

  const handleSendInvitations = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      toast({ message: 'Please sign in to send invitations.', tone: 'neutral' });
      setOpen(false);
      setAuthModalOpen(true);
      return;
    }

    if (!currentUser.isEmailVerified) {
      toast({
        message: 'Please verify your email address before inviting collaborators.',
        tone: 'neutral',
      });
      setOpen(false);
      setAuthModalOpen(true);
      return;
    }

    const validEmails = inviteRows
      .map((r) => ({ ...r, email: r.email.trim() }))
      .filter((r) => r.email.length > 0);

    if (validEmails.length === 0) {
      toast({ message: 'Please enter at least one email address', tone: 'neutral' });
      return;
    }

    setIsSending(true);
    try {
      // 1. Resolve workspace
      let wsId = useCollaborationStore.getState().activeWorkspaceId;
      if (!wsId) {
        let wsList = useCollaborationStore.getState().workspaces;
        if (wsList.length === 0) {
          wsList = await useCollaborationStore.getState().loadWorkspaces();
        }
        if (wsList.length === 0) {
          const defaultWs = await authClient.createWorkspace({ name: 'Personal Workspace' });
          wsId = defaultWs.id;
          useCollaborationStore.setState({
            workspaces: [{ ...defaultWs, role: 'owner' }],
            activeWorkspaceId: defaultWs.id,
          });
        } else {
          wsId = wsList[0].id;
          useCollaborationStore.setState({ activeWorkspaceId: wsId });
        }
      }

      // 2. Resolve or publish current canvas to cloud
      let targetDiagramId = useCollaborationStore.getState().activeDiagramId;
      const currentCanvasId = useCanvasStore.getState().projectId;
      const projectStore = useProjectStore.getState();
      const currentProj = projectStore.projects.find(
        (p) => p.id === currentCanvasId || p.cloudDiagramId === currentCanvasId
      );

      if (!targetDiagramId && currentProj?.cloudDiagramId) {
        targetDiagramId = currentProj.cloudDiagramId;
      }

      // If the canvas is not yet published to the cloud, automatically publish it now!
      if (!targetDiagramId) {
        const pubResult = await useCollaborationStore.getState().publishCurrentCanvas(wsId);
        if (pubResult.success && pubResult.diagramId) {
          targetDiagramId = pubResult.diagramId;
        }
      }

      // Ensure activeDiagramId and isLive are set on owner so WebSocket connects immediately
      if (targetDiagramId) {
        useCollaborationStore.setState({
          activeDiagramId: targetDiagramId,
          activeWorkspaceId: wsId,
          isLive: true,
        });
      }

      // 3. Resolve exact canvas URL
      const currentCanvasUrl = targetDiagramId
        ? `/canvas?id=${encodeURIComponent(targetDiagramId)}`
        : (typeof window !== 'undefined' && window.location.pathname.includes('/canvas')
            ? window.location.pathname + window.location.search
            : '/app');

      // 4. Send invitation via backend API for each email
      let invitedCount = 0;
      let existingMemberCount = 0;

      for (const r of validEmails) {
        const inviteRole: 'editor' | 'viewer' = r.role === 'viewer' ? 'viewer' : 'editor';
        try {
          const invRes = await authClient.sendWorkspaceInvitation(
            wsId,
            r.email,
            inviteRole,
            currentCanvasUrl,
            currentCanvasUrl,
            targetDiagramId || undefined
          );
          if (invRes.status === 'accepted') {
            existingMemberCount++;
          } else {
            invitedCount++;
          }
        } catch (singleErr) {
          const errText = singleErr instanceof Error ? singleErr.message : '';
          if (errText.toLowerCase().includes('already a member')) {
            existingMemberCount++;
            continue;
          }

          useCollaborationStore.setState({
            invitationError: errText || 'Failed to send invitation email. Please try again.',
            lastFailedInvitationParams: {
              wsId,
              email: r.email,
              role: inviteRole,
              canvasUrl: currentCanvasUrl,
              diagramId: targetDiagramId || undefined,
            },
          });
          throw singleErr;
        }
      }

      useCollaborationStore.setState({
        invitationError: null,
        lastFailedInvitationParams: null,
      });

      if (existingMemberCount > 0 && invitedCount === 0) {
        toast({
          message: `${validEmails.map((r) => r.email).join(', ')} already has workspace access. Canvas link sent!`,
          tone: 'ok',
        });
      } else {
        toast({
          message: `Sent invitation to ${validEmails.map((r) => r.email).join(', ')}!`,
          tone: 'ok',
        });
      }
      setInviteRows([{ id: '1', email: '', role: 'editor' }]);
      setOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send invitations.';
      toast({
        message: msg,
        tone: 'danger',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const targetDiagramId = useCollaborationStore.getState().activeDiagramId;
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://drawzware.app';
      const shareUrl = targetDiagramId
        ? `${origin}/canvas?id=${encodeURIComponent(targetDiagramId)}`
        : (typeof window !== 'undefined' ? window.location.href : 'https://drawzware.app/canvas');
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast({ message: 'Collaboration link copied', tone: 'ok' });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast({ message: "Couldn't copy link", tone: 'danger' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => setOpen(o, tab)}>
      <DialogContent className="max-w-[460px] p-0 overflow-hidden border border-line bg-card/95 shadow-2xl backdrop-blur-md">
        <DialogHeader className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-line/60">
          <DialogTitle className="text-[17px] font-semibold text-ink tracking-tight">
            Invite people
          </DialogTitle>
          <DialogDescription className="sr-only">
            Invite team members to collaborate on this workspace.
          </DialogDescription>
          <DialogCloseButton />
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex border-b border-line bg-surface-2/30 px-6 pt-2">
          <button
            type="button"
            onClick={() => setTab('invite')}
            className={`pb-2.5 px-3 text-[13px] font-medium border-b-2 transition-all cursor-pointer ${
              tab === 'invite'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            Invite by email
          </button>
          <button
            type="button"
            onClick={() => setTab('manage')}
            className={`pb-2.5 px-3 text-[13px] font-medium border-b-2 transition-all cursor-pointer ${
              tab === 'manage'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            Manage access ({collaborators.length})
          </button>
        </div>

        <DialogBody className="px-6 py-5">
          {tab === 'invite' ? (
            <form onSubmit={handleSendInvitations} className="space-y-4">
              {!currentUser && (
                <div className="p-2.5 rounded-lg bg-accent-soft/70 border border-accent/25 text-[12px] flex items-center justify-between">
                  <span className="text-ink-2">Sign in to send invitations via Drawzware Cloud</span>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setAuthModalOpen(true);
                    }}
                    className="text-accent font-semibold hover:underline cursor-pointer ml-2 shrink-0"
                  >
                    Sign in →
                  </button>
                </div>
              )}

              {currentUser && !currentUser.isEmailVerified && (
                <div className="p-2.5 rounded-lg bg-warn/10 border border-warn/30 text-[12px] flex items-center justify-between">
                  <span className="text-warn">Verify your account email to invite cloud collaborators</span>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setAuthModalOpen(true);
                    }}
                    className="text-warn font-semibold hover:underline cursor-pointer ml-2 shrink-0"
                  >
                    Verify email →
                  </button>
                </div>
              )}

              <div className="space-y-2.5">
                {inviteRows.map((row, idx) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-3" />
                      <Input
                        type="email"
                        placeholder="colleague@example.com"
                        value={row.email}
                        onChange={(e) => handleUpdateRowEmail(row.id, e.target.value)}
                        className="pl-9 h-9 text-[13px]"
                        autoFocus={idx === 0}
                      />
                    </div>

                    {/* Role Selector */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex h-9 items-center gap-1.5 rounded-[8px] border border-line bg-paper px-3 text-[12.5px] font-medium text-ink hover:bg-line-2 transition-colors cursor-pointer select-none"
                        >
                          <span className="capitalize">{row.role}</span>
                          <ChevronDown className="size-3.5 text-ink-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[120px]">
                        <DropdownMenuItem onSelect={() => handleUpdateRowRole(row.id, 'editor')}>
                          Editor
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleUpdateRowRole(row.id, 'viewer')}>
                          Viewer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {inviteRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        aria-label="Remove recipient"
                        className="flex size-9 items-center justify-center rounded-[8px] text-ink-3 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add another button */}
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent hover:underline cursor-pointer"
              >
                <Plus className="size-3.5" />
                Add another
              </button>

              {/* Message field */}
              <div>
                <label htmlFor="invite-message" className="block text-[12px] font-medium text-ink-2 mb-1.5">
                  Message (optional)
                </label>
                <textarea
                  id="invite-message"
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full resize-none rounded-[10px] border border-line bg-paper px-3 py-2 text-[12.5px] text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSending}
                  className="w-full h-10 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-[13.5px] rounded-[10px] shadow-sm transition-all"
                >
                  {isSending ? 'Sending invitations…' : 'Send invitation'}
                </Button>
              </div>

              {/* Demo Helper to Preview Invitation Email */}
              <div className="pt-2 border-t border-line/60 flex items-center justify-between text-[11px] text-ink-3">
                <span>Want to test the recipient view?</span>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setInvitationAcceptModalOpen(true);
                  }}
                  className="text-accent font-medium hover:underline cursor-pointer"
                >
                  Preview invitation card →
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Collaborator Roster with Permissions */}
              <div className="space-y-1.5 divide-y divide-line/40 max-h-[250px] overflow-y-auto pr-1">
                {collaborators.map((collab) => (
                  <div key={collab.id} className="flex items-center justify-between pt-2 pb-1.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        style={{ backgroundColor: collab.color }}
                        className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-2xs"
                      >
                        {collab.initials}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate text-[13px] font-medium text-ink">
                            {collab.name}
                          </span>
                          {collab.role === 'owner' && (
                            <span className="rounded bg-accent-soft px-1.5 py-0.2 text-[10px] font-semibold text-accent">
                              Owner
                            </span>
                          )}
                        </div>
                        <span className="block truncate text-[11px] text-ink-3">
                          {collab.email}
                        </span>
                      </div>
                    </div>

                    {/* Role Dropdown */}
                    <div className="flex items-center gap-2 shrink-0">
                      {collab.role === 'owner' ? (
                        <span className="text-[12px] text-ink-3 font-medium px-2 py-1">Owner</span>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="flex h-8 items-center gap-1.5 rounded-[7px] border border-line bg-paper px-2.5 text-[12px] font-medium text-ink hover:bg-line-2 transition-colors cursor-pointer"
                            >
                              <span className="capitalize">{collab.role}</span>
                              <ChevronDown className="size-3 text-ink-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[125px]">
                            <DropdownMenuItem onSelect={() => updateCollaboratorRole(collab.id, 'editor')}>
                              Editor
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => updateCollaboratorRole(collab.id, 'viewer')}>
                              Viewer
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => removeCollaborator(collab.id)}
                              className="text-danger focus:text-danger"
                            >
                              Revoke access
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* General Link Access Bar */}
              <div className="flex items-center justify-between rounded-[10px] border border-line bg-surface-2/40 px-3 py-2 text-[12px]">
                <div className="flex items-center gap-2">
                  <Shield className="size-3.5 text-ink-3" />
                  <span className="text-ink-2 font-medium">Link access: Anyone with link can view</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 text-accent font-medium hover:underline cursor-pointer"
                >
                  {copiedLink ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copiedLink ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
