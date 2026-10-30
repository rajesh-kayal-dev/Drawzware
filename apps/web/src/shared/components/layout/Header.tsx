'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArchiveRestore, Container, Download, FileJson, FolderOpen, Github, Home, Moon, Settings2, Sun, Upload } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { SimpleTooltip } from '@/shared/components/ui/tooltip';
import { useTheme } from '@/shared/hooks/useTheme';
import { usePwaInstall } from '@/features/pwa/hooks/usePwaInstall';
import { useIsDesktop } from '@/shared/hooks/useIsDesktop';
import { UserAccountMenu } from '@/features/collaboration/components/UserAccountMenu';
import { useCollaborationStore } from '@/features/collaboration/stores/useCollaborationStore';
import { cn } from '@/shared/utils/utils';

interface HeaderProps {
  /** Opens a native or web .drawz project file. */
  onOpenDrawz?: () => void;
  /** Imports a Drawzware project backup. */
  onImportBackup?: () => void;
  /** Exports all projects to a Drawzware backup file. */
  onExportAll?: () => void;
  /** Dashboard only: passing either handler shows the Import menu. */
  onImportJson?: () => void;
  onImportDockerCompose?: () => void;
  /** Width of the inner row; match the page's content container so edges line up. */
  containerClassName?: string;
}

/** Sticky 56px app header for the dashboard and settings. The canvas has its own header. */
export function Header({
  onOpenDrawz,
  onImportBackup,
  onExportAll,
  onImportJson,
  onImportDockerCompose,
  containerClassName,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();
  const isDesktop = useIsDesktop();
  const currentUser = useCollaborationStore((s) => s.currentUser);
  const setAuthModalOpen = useCollaborationStore((s) => s.setAuthModalOpen);
  const showImport = !!(onImportJson || onImportDockerCompose || onOpenDrawz || onImportBackup);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_oklch,var(--bg)_85%,transparent)] backdrop-blur-md">
      <div className={cn('mx-auto flex h-14 w-full max-w-[1400px] items-center gap-3 px-6 sm:px-8', containerClassName)}>
        <Link
          href="/app"
          className="focus-ring -ml-1 flex items-center gap-2 rounded-lg py-1 pr-2 pl-1 transition-opacity hover:opacity-90"
          aria-label="Drawzware Dashboard"
        >
          {/* Dark theme logo */}
          <Image
            src="/drawzware-logo-white.png"
            alt="Drawzware"
            width={160}
            height={38}
            priority
            className="h-8 w-auto object-contain dark:block hidden"
          />
          {/* Light theme logo */}
          <Image
            src="/drawzware-logo.png"
            alt="Drawzware"
            width={160}
            height={38}
            priority
            className="h-8 w-auto object-contain dark:hidden block"
          />
        </Link>

        <div className="-mr-1.5 ml-auto flex items-center gap-1.5">
          {onOpenDrawz && (
            <Button
              variant="ghost"
              onClick={onOpenDrawz}
              className="h-8 gap-1.5 px-3 text-xs text-ink-2 hover:text-ink hover:bg-line-2 rounded-lg cursor-pointer"
            >
              <FolderOpen className="size-3.5" />
              <span>Open .drawz</span>
            </Button>
          )}

          {onExportAll && (
            <Button
              variant="ghost"
              onClick={onExportAll}
              className="h-8 gap-1.5 px-3 text-xs text-ink-2 hover:text-ink hover:bg-line-2 rounded-lg cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>Export All</span>
            </Button>
          )}

          {showImport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 gap-1.5 px-3 text-xs text-ink-2 hover:text-ink hover:bg-line-2 rounded-lg">
                  <Upload className="size-3.5" />
                  <span>Import</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-paper border-line text-ink">
                {onOpenDrawz && (
                  <DropdownMenuItem onSelect={onOpenDrawz} className="cursor-pointer text-xs">
                    <FolderOpen className="size-3.5 mr-2" />
                    Open .drawz File…
                  </DropdownMenuItem>
                )}
                {onImportBackup && (
                  <DropdownMenuItem onSelect={onImportBackup} className="cursor-pointer text-xs">
                    <ArchiveRestore className="size-3.5 mr-2" />
                    Import Project Backup…
                  </DropdownMenuItem>
                )}
                {onImportJson && (
                  <DropdownMenuItem onSelect={onImportJson} className="cursor-pointer text-xs">
                    <FileJson className="size-3.5 mr-2" />
                    JSON
                  </DropdownMenuItem>
                )}
                {onImportDockerCompose && (
                  <DropdownMenuItem onSelect={onImportDockerCompose} className="cursor-pointer text-xs">
                    <Container className="size-3.5 mr-2" />
                    Docker Compose
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!isDesktop && isInstallable && !isInstalled && (
            <SimpleTooltip label="Install App">
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-8 text-accent hover:text-accent hover:bg-accent/15 rounded-lg transition-transform hover:scale-105"
                onClick={promptInstall}
                aria-label="Install App"
              >
                <Download className="size-4" />
              </Button>
            </SimpleTooltip>
          )}

          {!isDesktop && !isInstalled && (
            <SimpleTooltip label="Website">
              <Button variant="ghost" size="icon-sm" className="size-8 text-ink-3 hover:text-ink hover:bg-line-2 rounded-lg" asChild>
                <Link href="/" aria-label="Website">
                  <Home className="size-4" />
                </Link>
              </Button>
            </SimpleTooltip>
          )}

          <SimpleTooltip label="Settings">
            <Button variant="ghost" size="icon-sm" className="size-8 text-ink-3 hover:text-ink hover:bg-line-2 rounded-lg" asChild>
              <Link href="/settings" aria-label="Settings">
                <Settings2 className="size-4" />
              </Link>
            </Button>
          </SimpleTooltip>

          <SimpleTooltip label={theme === 'dark' ? 'Light theme' : 'Dark theme'}>
            <Button variant="ghost" size="icon-sm" className="size-8 text-ink-3 hover:text-ink hover:bg-line-2 rounded-lg" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </SimpleTooltip>

          <SimpleTooltip label="GitHub">
            <Button variant="ghost" size="icon-sm" className="size-8 text-ink-3 hover:text-ink hover:bg-line-2 rounded-lg" asChild>
              <a
                href="https://github.com/rajesh-kayal-dev/Drawzware"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
              >
                <Github className="size-4" />
              </a>
            </Button>
          </SimpleTooltip>

          {/* User Account Menu (when authenticated) or Sign In button */}
          {currentUser ? (
            <div className="ml-1 pl-1.5 border-l border-line/60">
              <UserAccountMenu />
            </div>
          ) : (
            <div className="ml-1 pl-1.5 border-l border-line/60">
              <Button
                variant="ghost"
                onClick={() => setAuthModalOpen(true, 'login')}
                className="h-8 px-2.5 text-xs font-medium text-ink-2 hover:text-ink hover:bg-line-2 rounded-lg cursor-pointer"
              >
                Sign In
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
