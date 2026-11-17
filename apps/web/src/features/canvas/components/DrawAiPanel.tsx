'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp, BookOpen, Database, Ellipsis, File, FileText, GitBranch, Layers, Link2, Menu, Network, Plus, Puzzle, Sparkles, Workflow } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
import { useSettingsStore } from '@/features/settings/stores/useSettingsStore';
import { useTheme } from '@/shared/hooks/useTheme';
import { toast } from '@/stores/useToastStore';

const diagramTypes = [
  { label: 'Architecture Diagram', icon: Network },
  { label: 'Flow Chart', icon: Workflow },
  { label: 'Entity Relationship', icon: Database },
  { label: 'Sequence Diagram', icon: GitBranch },
  { label: 'BPMN Diagram', icon: Layers },
  { label: 'Document', icon: FileText },
] as const;

const startingPoints = [
  { label: 'Template', icon: BookOpen },
  { label: 'File', icon: File },
  { label: 'Git Repo', icon: GitBranch },
] as const;

type DiagramType = (typeof diagramTypes)[number]['label'];
export function DrawAiPanel() {
  const { theme } = useTheme();
  const canvasBackground = useSettingsStore((state) => state.canvasBackground);
  const panelTheme = canvasBackground === 'white' ? 'light' : canvasBackground === 'dark' ? 'dark' : theme;
  const [diagramType, setDiagramType] = useState<DiagramType>('Architecture Diagram');
  const [startingPoint, setStartingPoint] = useState<(typeof startingPoints)[number]['label'] | null>(null);
  const [prompt, setPrompt] = useState('');
  const [submittedPrompt, setSubmittedPrompt] = useState('');
  const [conversations, setConversations] = useState<string[]>([]);
  const [conversationQuery, setConversationQuery] = useState('');
  const filteredConversations = conversations.filter((conversation) =>
    conversation.toLowerCase().includes(conversationQuery.trim().toLowerCase())
  );

  const submitPrompt = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = prompt.trim();
    if (!value) return;
    setSubmittedPrompt(value);
    setConversations((current) => [value, ...current.filter((conversation) => conversation !== value)]);
    setPrompt('');
  };

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <section data-theme={panelTheme} aria-label="Drawz AI workspace" className="animate-panel-in absolute top-4 bottom-4 right-4 z-20 flex w-[min(420px,calc(100vw-96px))] flex-col overflow-hidden rounded-2xl border border-line bg-paper text-ink shadow-[var(--shadow-xl)]">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-line px-3.5">
        <div className="flex items-center gap-2 text-[13px] font-semibold"><Sparkles className="size-4 text-accent" />Drawz AI</div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Conversation history" className="focus-ring flex size-7 items-center justify-center rounded-lg text-ink-2 hover:bg-line-2 hover:text-ink"><Menu className="size-4" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent data-theme={panelTheme} align="end" className="w-[240px] border-line bg-paper p-2 text-ink shadow-[var(--shadow-xl)]">
              <div className="border-b border-line pb-2">
                <label htmlFor="draw-ai-conversation-search" className="sr-only">Search conversations</label>
                <input id="draw-ai-conversation-search" value={conversationQuery} onChange={(event) => setConversationQuery(event.target.value)} onKeyDown={(event) => event.stopPropagation()} placeholder="Search conversations" className="focus-ring w-full rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[11px] text-ink outline-none placeholder:text-ink-3 focus:border-accent" />
              </div>
              <div className="max-h-44 overflow-y-auto py-2">
                <p className="px-2 pb-1 text-[10px] font-semibold text-ink-2">Past conversations</p>
                {filteredConversations.length ? filteredConversations.map((conversation) => (
                  <DropdownMenuItem key={conversation} onSelect={() => setSubmittedPrompt(conversation)} className="truncate text-[11px] text-ink focus:bg-line-2">{conversation}</DropdownMenuItem>
                )) : <p className="px-2 py-3 text-center text-[10px] text-ink-3">No conversations found</p>}
              </div>
              <div className="border-t border-line pt-1">
                <DropdownMenuItem onSelect={() => { setSubmittedPrompt(''); setPrompt(''); }} className="gap-2 text-[11px] text-ink focus:bg-line-2"><Plus className="size-3.5" />New conversation</DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Drawz AI options" className="focus-ring flex size-7 items-center justify-center rounded-lg text-ink-2 hover:bg-line-2 hover:text-ink"><Ellipsis className="size-4" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent data-theme={panelTheme} align="end" className="w-[186px] border-line bg-paper p-1.5 text-ink shadow-[var(--shadow-xl)]">
              <DropdownMenuItem onSelect={() => toast({ message: 'Models are not available yet' })} className="text-[11px] text-ink focus:bg-line-2"><Layers className="size-4" />Models</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toast({ message: 'Adding models is not available yet' })} className="text-[11px] text-ink focus:bg-line-2"><Plus className="size-4" />Add models</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toast({ message: 'MCP is not available yet' })} className="text-[11px] text-ink focus:bg-line-2"><Link2 className="size-4" />MCP</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toast({ message: 'Plugins are not available yet' })} className="text-[11px] text-ink focus:bg-line-2"><Puzzle className="size-4" />Plugins</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toast({ message: 'Skills are not available yet' })} className="text-[11px] text-ink focus:bg-line-2"><Sparkles className="size-4" />Skills</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6">
        {submittedPrompt ? (
          <div className="space-y-3" aria-live="polite">
            <div className="ml-7 rounded-xl rounded-tr-sm bg-line-2 px-3 py-2.5 text-[12px] leading-relaxed text-ink break-words">{submittedPrompt}</div>
            <div className="flex gap-2 text-[11px] leading-relaxed text-ink-2"><Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent" /><span>Diagram generation is not available yet. Your prompt was not sent.</span></div>
          </div>
        ) : (
          <div className="space-y-5 pb-4" style={{ marginTop: 'auto' }}>
            <div className="space-y-3">
              <h2 className="text-center text-[14px] font-semibold tracking-tight">What would you like to create?</h2>
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Diagram type">
                {diagramTypes.map(({ label, icon: Icon }) => (
                  <button key={label} type="button" aria-pressed={diagramType === label} onClick={() => setDiagramType(label)} style={{ minHeight: 88 }} className={`focus-ring flex flex-col items-center justify-center gap-2 rounded-lg border px-1.5 py-2 text-center text-[11px] font-medium leading-tight transition-colors ${diagramType === label ? 'border-accent bg-accent/10 text-ink' : 'border-line bg-card/70 text-ink-2 hover:border-accent/50 hover:bg-surface-2'}`}>
                    <Icon className={`size-[19px] ${diagramType === label ? 'text-accent' : 'text-ink-2'}`} strokeWidth={1.7} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-center text-[13px] font-semibold tracking-tight">Already have something to start with?</h3>
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Starting point">
                {startingPoints.map(({ label, icon: Icon }) => (
                  <button key={label} type="button" aria-pressed={startingPoint === label} onClick={() => setStartingPoint(label)} className={`focus-ring flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-lg border px-1.5 py-2 text-center text-[11px] font-medium transition-colors ${startingPoint === label ? 'border-accent bg-accent/10 text-ink' : 'border-line bg-card/70 text-ink-2 hover:border-accent/50 hover:bg-surface-2'}`}>
                    <Icon className="size-[18px] text-ink-2" strokeWidth={1.7} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line bg-paper p-4">
        <form onSubmit={submitPrompt} className="rounded-xl border border-accent/55 bg-card/70 p-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/30">
          <label htmlFor="draw-ai-prompt" className="sr-only">Describe your diagram</label>
          <textarea id="draw-ai-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={handlePromptKeyDown} rows={3} placeholder="Describe what to create or edit..." className="w-full resize-none bg-transparent px-1 text-[12px] leading-relaxed text-ink outline-none placeholder:text-ink-3" />
          <div className="flex items-center justify-between px-1"><button type="button" onClick={() => toast({ message: 'Adding references is not available yet' })} aria-label="Add reference" className="focus-ring flex size-7 items-center justify-center rounded-lg text-ink-2 hover:bg-line-2 hover:text-ink"><Plus className="size-4" /></button><button type="submit" disabled={!prompt.trim()} aria-label="Send prompt" className="focus-ring flex size-7 items-center justify-center rounded-lg bg-accent text-accent-ink hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"><ArrowUp className="size-4" /></button></div>
        </form>
      </div>
    </section>
  );
}
