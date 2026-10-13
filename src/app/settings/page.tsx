'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ChevronRight,
  Database,
  Download,
  Github,
  Info,
  LayoutGrid,
  Monitor,
  Trash2,
  Upload,
} from 'lucide-react';
import packageJson from '../../../package.json';
import { Header } from '@/components/layout/Header';
import { ConfirmDialog } from '@/components/project/ConfirmDialog';
import { exportAllProjectsFile, importFile, pickFile } from '@/components/project/project-io';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/hooks/useTheme';
import { getStorageSize } from '@/lib/storage';
import { cn, formatBytes, plural } from '@/lib/utils';
import { useProjectStore } from '@/stores/useProjectStore';
import { useSettingsStore, type ThemePreference } from '@/stores/useSettingsStore';
import { toast } from '@/stores/useToastStore';

const SECTIONS = [
  { id: 'appearance', label: 'Appearance', icon: Monitor },
  { id: 'canvas', label: 'Canvas', icon: LayoutGrid },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'about', label: 'About', icon: Info },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export default function SettingsPage() {
  const { preference, setPreference } = useTheme();
  const snap = useSettingsStore((s) => s.snap);
  const minimap = useSettingsStore((s) => s.minimap);
  const validation = useSettingsStore((s) => s.validation);
  const animatedEdges = useSettingsStore((s) => s.animatedEdges);
  const setSnap = useSettingsStore((s) => s.setSnap);
  const setMinimap = useSettingsStore((s) => s.setMinimap);
  const setValidation = useSettingsStore((s) => s.setValidation);
  const setAnimatedEdges = useSettingsStore((s) => s.setAnimatedEdges);

  const projects = useProjectStore((s) => s.projects);
  const loaded = useProjectStore((s) => s.loaded);
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const clearAllProjects = useProjectStore((s) => s.clearAllProjects);

  const [active, setActive] = useState<SectionId>('appearance');
  const [confirmClear, setConfirmClear] = useState(false);
  const lockUntil = useRef(0);

  useEffect(() => {
    if (!loaded) loadProjects();
  }, [loaded, loadProjects]);

  // Highlight the section nearest the top while scrolling.
  useEffect(() => {
    const onScroll = () => {
      if (performance.now() < lockUntil.current) return;
      const doc = document.documentElement;
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) {
        setActive(SECTIONS[SECTIONS.length - 1].id);
        return;
      }
      let current: SectionId = SECTIONS[0].id;
      for (const section of SECTIONS) {
        const el = document.getElementById(`s-${section.id}`);
        if (el && el.getBoundingClientRect().top <= 140) current = section.id;
      }
      setActive(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goTo = (id: SectionId, eventTime: number) => {
    setActive(id);
    lockUntil.current = eventTime + 800;
    document.getElementById(`s-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const storageBytes = loaded ? getStorageSize() : 0;

  const handleExportAll = () => {
    const filename = exportAllProjectsFile(useProjectStore.getState().projects);
    toast({ message: `Exported ${filename}`, tone: 'ok' });
  };

  const handleImport = async () => {
    const file = await pickFile('.json,application/json');
    if (!file) return;
    const imported = await importFile(file);
    if (imported.length > 0) {
      toast({ message: `Imported ${plural(imported.length, 'project')}`, tone: 'ok' });
    }
  };

  const handleClear = () => {
    clearAllProjects();
    setConfirmClear(false);
    toast({ message: 'All projects cleared', icon: Trash2 });
  };

  return (
    <div className="min-h-screen bg-bg dot-grid [background-size:20px_20px] bg-fixed text-ink">
      <Header containerClassName="max-w-[1240px]" />

      <main className="mx-auto w-full max-w-[1240px] px-6 sm:px-8 pt-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 lg:gap-12 items-start">
          {/* ── Left Sidebar Navigation ── */}
          <nav
            aria-label="Settings sections"
            className="sticky top-20 rounded-2xl border border-line bg-paper/95 backdrop-blur-md p-2 flex flex-col gap-1.5 shadow-xs"
          >
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isCurrent = active === section.id;
              return (
                <a
                  key={section.id}
                  href={`#s-${section.id}`}
                  aria-current={isCurrent ? 'true' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    goTo(section.id, e.timeStamp);
                  }}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all duration-150 group cursor-pointer',
                    isCurrent
                      ? 'bg-accent/15 text-accent border border-accent/30 font-semibold shadow-2xs'
                      : 'text-ink-2 hover:bg-line-2 hover:text-ink border border-transparent'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn('size-4 transition-colors', isCurrent ? 'text-accent' : 'text-ink-3 group-hover:text-ink')} />
                    <span>{section.label}</span>
                  </div>
                  <ChevronRight
                    className={cn(
                      'size-3.5 transition-transform',
                      isCurrent
                        ? 'text-accent opacity-100'
                        : 'text-ink-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5'
                    )}
                  />
                </a>
              );
            })}
          </nav>

          {/* ── Right Content Area ── */}
          <div className="space-y-8 min-w-0">
            {/* Header info */}
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-2 hover:text-ink transition-colors mb-2.5"
              >
                <ArrowLeft className="size-3.5" />
                <span>Projects</span>
              </Link>
              <h1 className="text-3xl font-bold tracking-tight text-ink">Settings</h1>
              <p className="mt-1 text-sm text-ink-2">Customize your Drawzware experience.</p>
            </div>

            {/* 1. Appearance Section */}
            <Section id="appearance" title="Appearance" icon={Monitor}>
              <Row title="Theme" description="Follows your system by default.">
                <div className="flex items-center rounded-xl border border-line bg-paper p-1 gap-1">
                  {THEME_OPTIONS.map((opt) => {
                    const selected = preference === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPreference(opt.value)}
                        className={cn(
                          'rounded-lg px-4 py-1.5 text-xs font-medium transition-all cursor-pointer',
                          selected
                            ? 'bg-accent text-accent-ink font-semibold shadow-2xs'
                            : 'text-ink-2 hover:text-ink'
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </Row>
            </Section>

            {/* 2. Canvas Section */}
            <Section id="canvas" title="Canvas" icon={LayoutGrid}>
              <Row title="Snap to grid" description="20px dot grid.">
                <Switch aria-label="Snap to grid" checked={snap} onCheckedChange={setSnap} />
              </Row>
              <Row title="Show minimap">
                <Switch aria-label="Show minimap" checked={minimap} onCheckedChange={setMinimap} />
              </Row>
              <Row title="Validation checks" description="Flags disconnected components and missing tech.">
                <Switch aria-label="Validation checks" checked={validation} onCheckedChange={setValidation} />
              </Row>
              <Row title="Animated edges" description="Flow animation on async connections.">
                <Switch aria-label="Animated edges" checked={animatedEdges} onCheckedChange={setAnimatedEdges} />
              </Row>
            </Section>

            {/* 3. Data Section */}
            <Section id="data" title="Data" icon={Database}>
              <Row
                title="Storage"
                description={
                  loaded ? `${plural(projects.length, 'project')} · ${formatBytes(storageBytes)} in this browser` : '—'
                }
              >
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-line-2/40 px-2.5 py-1 text-xs font-medium text-ink-2">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Local
                </span>
              </Row>
              <Row title="Export all projects" description="A single JSON file you can re-import.">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportAll}
                  disabled={!loaded || projects.length === 0}
                  className="rounded-lg text-xs gap-1.5"
                >
                  <Download className="size-3.5" />
                  Export
                </Button>
              </Row>
              <Row title="Import" description="Restore an export, or turn an endpoint list into a diagram.">
                <Button variant="secondary" size="sm" onClick={handleImport} className="rounded-lg text-xs gap-1.5">
                  <Upload className="size-3.5" />
                  Import
                </Button>
              </Row>
              <Row title="Clear all data" description="Removes every project from this browser.">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmClear(true)}
                  disabled={!loaded || projects.length === 0}
                  className="rounded-lg text-xs gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  Clear
                </Button>
              </Row>
            </Section>

            {/* 4. About Section */}
            <Section id="about" title="About" icon={Info}>
              <div className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-[#12281c] border border-[#1d6f42]/40 shadow-xs overflow-hidden">
                    <Image src="/drawzware-emblem.png" alt="Drawzware" width={26} height={26} className="size-5.5 object-contain" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink flex items-center gap-1.5">
                      <span>Drawzware</span>
                      <span className="font-mono text-xs font-normal text-ink-3">v{packageJson.version}</span>
                    </div>
                    <div className="text-xs text-ink-2 mt-0.5">Visual Architecture & Diagramming Tool · MIT</div>
                  </div>
                </div>

                <Button variant="secondary" size="sm" asChild className="rounded-lg text-xs gap-1.5">
                  <a href="https://github.com/rajesh-kayal-dev/Drawzware.git" target="_blank" rel="noreferrer">
                    <Github className="size-3.5" />
                    GitHub
                  </a>
                </Button>
              </div>
            </Section>
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear all data?"
        description={`${plural(projects.length, 'project')} will be removed from this browser. This can't be undone — export them first if you might need them.`}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button variant="danger-solid" onClick={handleClear}>
              Clear all data
            </Button>
          </>
        }
      />
    </div>
  );
}

function Section({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: SectionId;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section id={`s-${id}`} aria-labelledby={`s-${id}-title`} className="grid scroll-mt-24 gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Icon className="size-4 text-ink-2" />
        <h2 id={`s-${id}-title`}>{title}</h2>
      </div>
      <div className="rounded-2xl border border-line bg-paper overflow-hidden shadow-xs divide-y divide-line-2">
        {children}
      </div>
    </section>
  );
}

function Row({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ink">{title}</div>
        {description && <div className="text-xs text-ink-2 mt-0.5">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
