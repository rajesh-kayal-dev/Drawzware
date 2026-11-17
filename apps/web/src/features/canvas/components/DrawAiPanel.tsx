'use client';

import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp, BookOpen, ChevronDown, Database, Ellipsis, File, FileText, GitBranch, Layers, Link2, Menu, Network, PanelLeft, Plus, Puzzle, Sparkles, Workflow } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
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
type Model = 'Fast' | 'Balanced' | 'Best';

export function DrawAiPanel({ onCollapse }: { onCollapse: () => void }) {
  const [diagramType, setDiagramType] = useState<DiagramType>('Architecture Diagram');
  const [model, setModel] = useState<Model>('Balanced');
  const [startingPoint, setStartingPoint] = useState<(typeof startingPoints)[number]['label'] | null>(null);
  const [prompt, setPrompt] = useState('');
  const [submittedPrompt, setSubmittedPrompt] = useState('');
  const [conversations, setConversations] = useState<string[]>([]);
  const [conversationQuery, setConversationQuery] = useState('');
  const modelRef = useRef<HTMLSelectElement>(null);
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
    <section aria-label="Draw AI workspace" className="animate-panel-in absolute top-4 bottom-4 right-4 z-20 flex w-[min(420px,calc(100vw-96px))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1e1d23] text-white shadow-[var(--shadow-xl)]">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-3.5">
        <div className="flex items-center gap-2 text-[13px] font-semibold"><Sparkles className="size-4 text-[#b7a4ff]" />Draw AI</div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Conversation history" className="focus-ring flex size-7 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"><Menu className="size-4" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" style={{ backgroundColor: '#242329' }} className="w-[240px] border-white/15 p-2 text-white shadow-[var(--shadow-xl)]">
              <div className="border-b border-white/10 pb-2">
                <label htmlFor="draw-ai-conversation-search" className="sr-only">Search conversations</label>
                <input id="draw-ai-conversation-search" value={conversationQuery} onChange={(event) => setConversationQuery(event.target.value)} onKeyDown={(event) => event.stopPropagation()} placeholder="Search conversations" className="focus-ring w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-[11px] text-white outline-none placeholder:text-white/45 focus:border-[#a992ff]/60" />
              </div>
              <div className="max-h-44 overflow-y-auto py-2">
                <p className="px-2 pb-1 text-[10px] font-semibold text-white/55">Past conversations</p>
                {filteredConversations.length ? filteredConversations.map((conversation) => (
                  <DropdownMenuItem key={conversation} onSelect={() => setSubmittedPrompt(conversation)} className="truncate text-[11px] text-white/80 focus:bg-white/10 focus:text-white">{conversation}</DropdownMenuItem>
                )) : <p className="px-2 py-3 text-center text-[10px] text-white/45">No conversations found</p>}
              </div>
              <div className="border-t border-white/10 pt-1">
                <DropdownMenuItem onSelect={() => { setSubmittedPrompt(''); setPrompt(''); }} className="gap-2 text-[11px] text-white/90 focus:bg-white/10 focus:text-white"><Plus className="size-3.5" />New conversation</DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Draw AI options" className="focus-ring flex size-7 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"><Ellipsis className="size-4" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" style={{ backgroundColor: '#242329' }} className="w-[186px] border-white/15 p-1.5 text-white shadow-[var(--shadow-xl)]">
              <DropdownMenuItem onSelect={() => modelRef.current?.focus()} className="text-[11px] text-white/85 focus:bg-white/10 focus:text-white"><Layers className="size-4" />Models</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toast({ message: 'Adding models is not available yet' })} className="text-[11px] text-white/85 focus:bg-white/10 focus:text-white"><Plus className="size-4" />Add models</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toast({ message: 'MCP is not available yet' })} className="text-[11px] text-white/85 focus:bg-white/10 focus:text-white"><Link2 className="size-4" />MCP</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toast({ message: 'Plugins are not available yet' })} className="text-[11px] text-white/85 focus:bg-white/10 focus:text-white"><Puzzle className="size-4" />Plugins</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toast({ message: 'Skills are not available yet' })} className="text-[11px] text-white/85 focus:bg-white/10 focus:text-white"><Sparkles className="size-4" />Skills</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button type="button" onClick={onCollapse} aria-label="Collapse Draw AI" className="focus-ring flex size-7 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"><PanelLeft className="size-4" /></button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6">
        {submittedPrompt ? (
          <div className="space-y-3" aria-live="polite">
            <div className="ml-7 rounded-xl rounded-tr-sm bg-white/10 px-3 py-2.5 text-[12px] leading-relaxed text-white/90 break-words">{submittedPrompt}</div>
            <div className="flex gap-2 text-[11px] leading-relaxed text-white/65"><Sparkles className="mt-0.5 size-3.5 shrink-0 text-[#b7a4ff]" /><span>Diagram generation is not available yet. Your prompt was not sent.</span></div>
          </div>
        ) : (
          <div className="space-y-5 pb-4" style={{ marginTop: 'auto' }}>
            <div className="space-y-3">
              <h2 className="text-center text-[14px] font-semibold tracking-tight">What would you like to create?</h2>
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Diagram type">
                {diagramTypes.map(({ label, icon: Icon }) => (
                  <button key={label} type="button" aria-pressed={diagramType === label} onClick={() => setDiagramType(label)} style={{ minHeight: 88 }} className={`focus-ring flex flex-col items-center justify-center gap-2 rounded-lg border px-1.5 py-2 text-center text-[11px] font-medium leading-tight transition-colors ${diagramType === label ? 'border-[#a992ff]/75 bg-[#8f79e8]/10 text-white' : 'border-white/15 bg-white/[0.02] text-white/75 hover:border-white/30 hover:bg-white/[0.06]'}`}>
                    <Icon className={`size-[19px] ${diagramType === label ? 'text-[#b7a4ff]' : 'text-white/70'}`} strokeWidth={1.7} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-center text-[13px] font-semibold tracking-tight">Already have something to start with?</h3>
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Starting point">
                {startingPoints.map(({ label, icon: Icon }) => (
                  <button key={label} type="button" aria-pressed={startingPoint === label} onClick={() => setStartingPoint(label)} className={`focus-ring flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-lg border px-1.5 py-2 text-center text-[11px] font-medium transition-colors ${startingPoint === label ? 'border-[#a992ff]/75 bg-[#8f79e8]/10 text-white' : 'border-white/15 bg-white/[0.02] text-white/75 hover:border-white/30 hover:bg-white/[0.06]'}`}>
                    <Icon className="size-[18px] text-white/70" strokeWidth={1.7} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 bg-[#1a191f] p-4">
        <label htmlFor="draw-ai-model" className="mb-2 flex items-center justify-between text-[10px] font-medium text-white/55"><span>Model</span><span>Preview only</span></label>
        <div className="relative mb-3">
          <select ref={modelRef} id="draw-ai-model" value={model} onChange={(event) => setModel(event.target.value as Model)} className="focus-ring w-full appearance-none rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 pr-8 text-[11px] font-medium text-white outline-none cursor-pointer">
            <option value="Fast" className="bg-[#1e1d23]">Fast</option>
            <option value="Balanced" className="bg-[#1e1d23]">Balanced</option>
            <option value="Best" className="bg-[#1e1d23]">Best</option>
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-2.5 size-3.5 text-white/60" />
        </div>
        <form onSubmit={submitPrompt} className="rounded-xl border border-[#a992ff]/55 bg-white/[0.05] p-2 focus-within:border-[#b7a4ff] focus-within:ring-1 focus-within:ring-[#b7a4ff]/30">
          <label htmlFor="draw-ai-prompt" className="sr-only">Describe your diagram</label>
          <textarea id="draw-ai-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={handlePromptKeyDown} rows={3} placeholder="Describe what to create or edit..." className="w-full resize-none bg-transparent px-1 text-[12px] leading-relaxed text-white outline-none placeholder:text-white/40" />
          <div className="flex items-center justify-between px-1"><button type="button" onClick={() => toast({ message: 'Adding references is not available yet' })} aria-label="Add reference" className="focus-ring flex size-7 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"><Plus className="size-4" /></button><button type="submit" disabled={!prompt.trim()} aria-label="Send prompt" className="focus-ring flex size-7 items-center justify-center rounded-lg bg-[#8f79e8] text-white hover:bg-[#a38ef2] disabled:cursor-not-allowed disabled:opacity-40"><ArrowUp className="size-4" /></button></div>
        </form>
      </div>
    </section>
  );
}
