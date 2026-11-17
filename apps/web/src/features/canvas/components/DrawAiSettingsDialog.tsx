'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  KeyRound,
  Layers,
  Link2,
  Plus,
  Server,
  Sparkles,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/components/ui/dialog';

export type DrawAiSettingsView = 'models' | 'add-model' | 'mcp' | 'skills';

type Props = {
  view: DrawAiSettingsView | null;
  onViewChange: (view: DrawAiSettingsView | null) => void;
  theme: 'light' | 'dark';
};

const providers = [
  { name: 'OpenAI', models: ['GPT-4o', 'GPT-4o mini'] },
  { name: 'Anthropic', models: ['Claude Sonnet', 'Claude Haiku'] },
  { name: 'Google Gemini', models: ['Gemini 2.5 Pro', 'Gemini 2.5 Flash'] },
  { name: 'OpenRouter', models: ['Custom model'] },
  { name: 'Ollama (Local)', models: ['Local model'] },
  { name: 'Custom', models: ['OpenAI-compatible model'] },
] as const;

const fieldClass = 'focus-ring h-9 w-full rounded-lg border border-line bg-paper px-3 text-[12px] text-ink outline-none placeholder:text-ink-3 disabled:cursor-not-allowed disabled:opacity-60';

function PreviewNote({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] leading-relaxed text-ink-2">{children}</p>;
}

function ModelsView({ onViewChange }: { onViewChange: Props['onViewChange'] }) {
  const [selected, setSelected] = useState<'free' | 'fast'>('free');

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-ink-2">Built-in models</p>
        <div className="overflow-hidden rounded-xl border border-line">
          {([
            { id: 'free', name: 'Drawz Free', detail: 'For everyday diagram requests', icon: Layers },
            { id: 'fast', name: 'Drawz Fast', detail: 'For quicker drafts', icon: Sparkles },
          ] as const).map(({ id, name, detail, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected === id}
              onClick={() => setSelected(id)}
              className={`focus-ring flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-surface-2 ${id === 'fast' ? 'border-t border-line' : ''} ${selected === id ? 'bg-accent/10' : ''}`}
            >
              <Icon className="size-4 shrink-0 text-ink-2" strokeWidth={1.7} />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium text-ink">{name}</span>
                <span className="block text-[11px] text-ink-2">{detail}</span>
              </span>
              {selected === id ? <Check className="size-4 text-accent" /> : <span className="size-4 rounded-full border border-line" />}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-ink-2">My models</p>
        <div className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-[12px] text-ink-2">No models added yet</div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <PreviewNote>Model selection is a UI preview. Prompts are not sent.</PreviewNote>
        <button type="button" onClick={() => onViewChange('add-model')} className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-2 text-[12px] font-medium text-ink hover:bg-surface-2"><Plus className="size-3.5" />Add model</button>
      </div>
    </div>
  );
}

function AddModelView({ onViewChange }: { onViewChange: Props['onViewChange'] }) {
  const [providerIndex, setProviderIndex] = useState(0);
  const [model, setModel] = useState<string>(providers[0].models[0]);
  const provider = providers[providerIndex];

  return (
    <div className="grid min-h-0 sm:grid-cols-[164px_minmax(0,1fr)]">
      <div className="border-b border-line p-4 sm:border-b-0 sm:border-r">
        <p className="mb-2 text-[11px] font-semibold text-ink-2">Provider</p>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-1">
          {providers.map((item, index) => (
            <button
              key={item.name}
              type="button"
              aria-pressed={providerIndex === index}
              onClick={() => { setProviderIndex(index); setModel(item.models[0]); }}
              className={`focus-ring truncate rounded-lg border px-2.5 py-2 text-left text-[11px] font-medium ${providerIndex === index ? 'border-accent bg-accent/10 text-ink' : 'border-transparent text-ink-2 hover:border-line hover:bg-surface-2'}`}
            >{item.name}</button>
          ))}
        </div>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <h3 className="text-[13px] font-semibold text-ink">{provider.name}</h3>
          <PreviewNote>Configure this provider when model connections become available.</PreviewNote>
        </div>
        <label className="block space-y-1.5 text-[11px] font-medium text-ink">
          <span>Model name</span>
          <span className="relative block">
            <select value={model} onChange={(event) => setModel(event.target.value)} className={`${fieldClass} appearance-none pr-8`}>
              {provider.models.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-2.5 size-4 text-ink-2" />
          </span>
        </label>
        <label className="block space-y-1.5 text-[11px] font-medium text-ink">
          <span>API key</span>
          <input type="password" autoComplete="off" disabled placeholder="Available when connections launch" className={fieldClass} />
        </label>
        <label className="block space-y-1.5 text-[11px] font-medium text-ink">
          <span>Base URL <span className="font-normal text-ink-3">(optional)</span></span>
          <input type="url" disabled placeholder="https://api.example.com/v1" className={fieldClass} />
        </label>
        <div className="flex items-center gap-2 border-t border-line pt-4">
          <button type="button" disabled className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-[11px] font-medium text-ink-3 disabled:cursor-not-allowed"><KeyRound className="size-3.5" />Test connection</button>
          <PreviewNote>Keys are not collected or stored in this preview.</PreviewNote>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onViewChange('models')} className="focus-ring rounded-full border border-line px-3.5 py-2 text-[12px] font-medium text-ink hover:bg-surface-2">Cancel</button>
          <button type="button" disabled className="rounded-full bg-accent px-3.5 py-2 text-[12px] font-medium text-accent-ink opacity-50 disabled:cursor-not-allowed">Save</button>
        </div>
      </div>
    </div>
  );
}

function EmptySetup({ icon: Icon, title, description }: { icon: typeof Link2; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-5 py-9 text-center">
      <Icon className="mx-auto mb-3 size-5 text-ink-2" strokeWidth={1.6} />
      <p className="text-[12px] font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-[270px] text-[11px] leading-relaxed text-ink-2">{description}</p>
    </div>
  );
}

function McpView() {
  return (
    <div className="space-y-5">
      <EmptySetup icon={Server} title="No MCP servers connected" description="Servers will let Drawz AI use tools and context from services you choose." />
      <div className="space-y-3 border-t border-line pt-4">
        <p className="text-[11px] font-semibold text-ink-2">Add a server</p>
        <label className="block space-y-1.5 text-[11px] font-medium text-ink"><span>Server name</span><input disabled placeholder="My server" className={fieldClass} /></label>
        <label className="block space-y-1.5 text-[11px] font-medium text-ink"><span>Server URL</span><input disabled type="url" placeholder="https://example.com/mcp" className={fieldClass} /></label>
        <div className="flex items-center justify-between gap-3"><PreviewNote>MCP connections are coming later.</PreviewNote><button type="button" disabled className="rounded-full bg-accent px-3.5 py-2 text-[12px] font-medium text-accent-ink opacity-50 disabled:cursor-not-allowed">Connect</button></div>
      </div>
    </div>
  );
}

function SkillsView() {
  return (
    <div className="space-y-4">
      <EmptySetup icon={Sparkles} title="No skills added" description="Skills will hold reusable instructions for diagram creation and editing." />
      <div className="flex items-center justify-between gap-3 border-t border-line pt-4"><PreviewNote>Skill creation is coming later.</PreviewNote><button type="button" disabled className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-[12px] font-medium text-ink-3 disabled:cursor-not-allowed"><Plus className="size-3.5" />New skill</button></div>
    </div>
  );
}

const viewCopy = {
  models: ['Models', 'Choose a model for Drawz AI.'],
  'add-model': ['Add Model', 'Set up a model provider.'],
  mcp: ['MCP servers', 'Manage tool and context connections.'],
  skills: ['Skills', 'Reusable instructions for diagram work.'],
} as const;

export function DrawAiSettingsDialog({ view, onViewChange, theme }: Props) {
  return (
    <Dialog open={view !== null} onOpenChange={(open) => { if (!open) onViewChange(null); }}>
      <DialogContent data-theme={theme} overlayClassName="animate-none backdrop-blur-none" className={`animate-none ${view === 'add-model' ? 'max-w-[600px]' : 'max-w-[440px]'}`}>
        {view && (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {view === 'add-model' && <button type="button" onClick={() => onViewChange('models')} aria-label="Back to models" className="focus-ring -ml-1 flex size-7 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink"><ArrowLeft className="size-4" /></button>}
                  <DialogTitle>{viewCopy[view][0]}</DialogTitle>
                </div>
                <DialogDescription>{viewCopy[view][1]}</DialogDescription>
              </div>
              <button type="button" onClick={() => onViewChange(null)} aria-label="Close settings" className="focus-ring flex size-7 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink"><X className="size-4" /></button>
            </div>
            <div className={view === 'add-model' ? 'min-h-0 overflow-y-auto' : 'min-h-0 overflow-y-auto p-5'}>
              {view === 'models' && <ModelsView onViewChange={onViewChange} />}
              {view === 'add-model' && <AddModelView onViewChange={onViewChange} />}
              {view === 'mcp' && <McpView />}
              {view === 'skills' && <SkillsView />}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
