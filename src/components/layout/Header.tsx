'use client';

import Link from 'next/link';
import { Boxes, Container, FileJson, Github, Moon, Settings2, Sun, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

interface HeaderProps {
  /** Dashboard only: passing either handler shows the Import menu. */
  onImportJson?: () => void;
  onImportDockerCompose?: () => void;
  /** Width of the inner row; match the page's content container so edges line up. */
  containerClassName?: string;
}

/** Sticky 56px app header for the dashboard and settings. The canvas has its own header. */
export function Header({ onImportJson, onImportDockerCompose, containerClassName }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const showImport = !!(onImportJson || onImportDockerCompose);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_oklch,var(--bg)_85%,transparent)] backdrop-blur-md">
      <div className={cn('mx-auto flex h-14 w-full max-w-[1400px] items-center gap-3 px-6 sm:px-8', containerClassName)}>
        <Link
          href="/"
          className="focus-ring -ml-1 flex items-center gap-2.5 rounded-full py-1 pr-2 pl-1 text-sm font-semibold whitespace-nowrap text-ink"
        >
          <span className="inline-flex size-7 items-center justify-center rounded-[8px] bg-accent text-accent-ink shadow-xs">
            <Boxes className="size-4" />
          </span>
          <span className="hidden sm:inline tracking-tight">System Design Canvas</span>
        </Link>

        <div className="-mr-1.5 ml-auto flex items-center gap-1.5">
          {showImport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 gap-1.5 px-3 text-xs text-ink-2 hover:text-ink hover:bg-line-2 rounded-lg">
                  <Upload className="size-3.5" />
                  <span>Import</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-paper border-line text-ink">
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
                href="https://github.com/rajesh-kayal-dev/System-design-canvas"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
              >
                <Github className="size-4" />
              </a>
            </Button>
          </SimpleTooltip>
        </div>
      </div>
    </header>
  );
}
