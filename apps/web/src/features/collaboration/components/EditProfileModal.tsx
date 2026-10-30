'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, User, Mail, Loader2, Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useCollaborationStore } from '../stores/useCollaborationStore';
import { authClient } from '../services/auth.client';
import { toast } from '@/stores/useToastStore';
import {
  formatCollaboratorName,
  getCollaboratorColor,
  getCollaboratorInitial,
} from '../utils/collaborator-helpers';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileModal({ open, onOpenChange }: EditProfileModalProps) {
  const currentUser = useCollaborationStore((s) => s.currentUser);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser && open) {
      setName(currentUser.name || formatCollaboratorName(null, currentUser.email));
      setError(null);
    }
  }, [currentUser, open]);

  if (!currentUser) return null;

  const userColor = getCollaboratorColor(currentUser.id || currentUser.email);
  const userInitial = getCollaboratorInitial(name || currentUser.name, currentUser.email);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean || clean.length < 2) {
      setError('Display name must be at least 2 characters long.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await authClient.updateProfile({ name: clean });
      
      // Update store state with refreshed name
      useCollaborationStore.setState((state) => {
        if (!state.currentUser) return state;
        const updatedUser = {
          ...state.currentUser,
          name: res.user.name,
          initials: res.user.name.slice(0, 1).toUpperCase(),
        };

        const updatedCollaborators = state.collaborators.map((c) =>
          c.isCurrentUser
            ? { ...c, name: `${res.user.name} (You)`, initials: res.user.name.slice(0, 1).toUpperCase() }
            : c
        );

        return {
          currentUser: updatedUser,
          collaborators: updatedCollaborators,
        };
      });

      toast({ message: `Display name updated to "${res.user.name}"`, tone: 'ok' });
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-[16px] border border-line bg-card p-6 shadow-2xl focus:outline-none animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <Dialog.Title className="text-[16px] font-semibold text-ink">
              Edit Profile
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSave} className="mt-5 space-y-4">
            {/* Avatar & Email Preview */}
            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-surface-2/50 border border-line/60">
              <span
                style={{ backgroundColor: userColor }}
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white shadow-xs select-none"
              >
                {userInitial}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">
                  {name || 'Your Name'}
                </span>
                <span className="flex items-center gap-1.5 truncate text-[11.5px] text-ink-3">
                  <Mail className="size-3 shrink-0" />
                  <span className="truncate">{currentUser.email}</span>
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive text-[12px] leading-relaxed">
                {error}
              </div>
            )}

            {/* Display Name Input */}
            <div className="space-y-1.5">
              <label htmlFor="display-name-input" className="text-[12px] font-medium text-ink-2 block">
                Display Name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-3" />
                <input
                  id="display-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your first or full name"
                  maxLength={50}
                  className="w-full h-10 rounded-lg border border-line bg-surface-2 pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/30"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-ink-3">
                This name is broadcast in real time to all collaborators on shared canvases.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className="h-9 px-3 text-[13px] cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !name.trim()}
                className="h-9 px-4 bg-[#6366f1] hover:bg-[#4f46e5] text-white text-[13px] font-medium rounded-lg shadow-sm cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    <span>Save changes</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
