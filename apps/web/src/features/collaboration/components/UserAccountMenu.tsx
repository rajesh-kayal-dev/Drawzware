'use client';

import { useState } from 'react';
import { LogOut, CheckCircle2, AlertCircle, ShieldCheck, Laptop, UserPen, Grid, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/shared/components/ui/dropdown-menu';
import { SimpleTooltip } from '@/shared/components/ui/tooltip';
import { useCollaborationStore } from '../stores/useCollaborationStore';
import { useSettingsStore, type CanvasBackground } from '@/features/settings/stores/useSettingsStore';
import { toast } from '@/stores/useToastStore';
import { cn } from '@/shared/utils/utils';
import {
  formatCollaboratorName,
  getCollaboratorColor,
  getCollaboratorInitial,
} from '../utils/collaborator-helpers';
import { EditProfileModal } from './EditProfileModal';

const BACKGROUND_OPTIONS: { id: CanvasBackground; label: string; desc: string }[] = [
  { id: 'dots', label: 'Dots', desc: 'Dotted canvas pattern' },
  { id: 'grid', label: 'Grid', desc: 'Square grid lines' },
  { id: 'white', label: 'White', desc: 'Plain white background' },
  { id: 'dark', label: 'Dark', desc: 'Plain dark background' },
  { id: 'neutral', label: 'Neutral', desc: 'Plain neutral background' },
];

export function UserAccountMenu() {
  const currentUser = useCollaborationStore((s) => s.currentUser);
  const isLive = useCollaborationStore((s) => s.isLive);
  const signOut = useCollaborationStore((s) => s.signOut);
  const canvasBackground = useSettingsStore((s) => s.canvasBackground);
  const setCanvasBackground = useSettingsStore((s) => s.setCanvasBackground);

  const [editProfileOpen, setEditProfileOpen] = useState(false);

  if (!currentUser) return null;

  const handleSignOut = async () => {
    await signOut();
    toast({
      message: 'Signed out successfully. Canvas is in personal offline mode.',
      tone: 'neutral',
    });
  };

  const isVerified = Boolean(currentUser.isEmailVerified);
  const formattedName = formatCollaboratorName(currentUser.name, currentUser.email);
  const userInitial = getCollaboratorInitial(formattedName, currentUser.email);
  const userColor = getCollaboratorColor(currentUser.id || currentUser.email);

  return (
    <>
      <EditProfileModal open={editProfileOpen} onOpenChange={setEditProfileOpen} />

      <DropdownMenu>
        <SimpleTooltip label={`Account: ${formattedName}`}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="User account menu"
              className={cn(
                'group relative flex size-8 items-center justify-center rounded-full border border-line/70 bg-card/70 backdrop-blur-xs shadow-2xs transition-all duration-150',
                'hover:-translate-y-0.5 hover:border-line-hover hover:shadow-xs active:translate-y-0 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                'data-[state=open]:border-accent data-[state=open]:ring-2 data-[state=open]:ring-accent/30'
              )}
            >
              <span
                style={{ backgroundColor: userColor }}
                className="flex size-7 items-center justify-center rounded-full text-[11.5px] font-bold text-white select-none shadow-2xs"
              >
                {userInitial}
              </span>
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-card',
                  isVerified ? 'bg-emerald-500' : 'bg-amber-500'
                )}
                title={isVerified ? 'Verified account' : 'Unverified email'}
              />
            </button>
          </DropdownMenuTrigger>
        </SimpleTooltip>

        <DropdownMenuContent align="end" className="w-[240px] p-1.5 shadow-xl rounded-xl">
          {/* User Identity Header */}
          <div className="px-2.5 py-2">
            <div className="flex items-center gap-2.5">
              <span
                style={{ backgroundColor: userColor }}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-2xs"
              >
                {userInitial}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink leading-tight">
                  {formattedName}
                </span>
                <span className="block truncate text-[11px] text-ink-3">
                  {currentUser.email}
                </span>
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-1.5">
              {isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-medium text-emerald-500 border border-emerald-500/25">
                  <CheckCircle2 className="size-3" />
                  Verified Account
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-medium text-amber-500 border border-amber-500/25">
                  <AlertCircle className="size-3" />
                  Unverified Email
                </span>
              )}
            </div>
          </div>

          <DropdownMenuSeparator className="my-1" />

          {/* Edit Profile Action */}
          <DropdownMenuItem
            onSelect={() => setEditProfileOpen(true)}
            className="cursor-pointer flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-[12.5px] font-medium text-ink hover:bg-surface-2"
          >
            <UserPen className="size-3.5 text-accent" />
            <span>Edit profile…</span>
          </DropdownMenuItem>

          {/* Canvas Background Settings */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-[12.5px] font-medium text-ink hover:bg-surface-2">
              <Grid className="size-3.5 text-ink-3" />
              <span>Canvas background</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-[180px] p-1 shadow-lg rounded-lg">
              <DropdownMenuLabel className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold text-ink-3">
                Background pattern
              </DropdownMenuLabel>
              {BACKGROUND_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.id}
                  onSelect={() => setCanvasBackground(opt.id)}
                  className="cursor-pointer flex items-center justify-between text-xs px-2 py-1.5 rounded-[6px]"
                >
                  <span className="text-ink font-medium">{opt.label}</span>
                  {canvasBackground === opt.id && (
                    <Check className="size-3.5 text-accent shrink-0 ml-1.5" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator className="my-1" />

          {/* Current Canvas Mode */}
          <DropdownMenuLabel className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold text-ink-3">
            Session Status
          </DropdownMenuLabel>
          <div className="px-2.5 py-1 text-[11.5px] flex items-center justify-between text-ink-2">
            <span className="flex items-center gap-1.5">
              {isLive ? (
                <ShieldCheck className="size-3.5 text-accent" />
              ) : (
                <Laptop className="size-3.5 text-ink-3" />
              )}
              Canvas Mode
            </span>
            <span className={cn('font-medium text-[11px]', isLive ? 'text-ok font-semibold' : 'text-ink-3')}>
              {isLive ? 'Live Cloud' : 'Personal (Offline)'}
            </span>
          </div>

          <DropdownMenuSeparator className="my-1" />

          {/* Sign Out Action */}
          <DropdownMenuItem
            onSelect={handleSignOut}
            className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-[12.5px] font-medium"
          >
            <LogOut className="size-3.5" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
