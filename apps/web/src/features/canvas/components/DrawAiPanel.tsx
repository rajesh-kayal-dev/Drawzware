'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp, ChevronDown, Database, GitBranch, Network, PanelLeft, Sparkles, Workflow } from 'lucide-react';

const diagramTypes = [
  { label: 'Architecture Diagram', icon: Network },
  { label: 'Flow Chart', icon: Workflow },
  { label: 'Sequence Diagram', icon: GitBranch },
  { label: 'ER Diagram', icon: Database },
] as const;

type DiagramType = (typeof diagramTypes)[number]['label'];
type Model = 'Fast' | 'Balanced' | 'Best';

export function DrawAiPanel({ onCollapse }: { onCollapse: () => void }) {
  const [diagramType, setDiagramType] = useState<DiagramType>('Architecture Diagram');
  const [model, setModel] = useState<Model>('Balanced');
  const [prompt, setPrompt] = useState('');
  const [submittedPrompt, setSubmittedPrompt] = useState('');

  const submitPrompt = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = prompt.trim();
    if (!value) return;
    setSubmittedPrompt(value);
    setPrompt('');
  };

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <section aria-label="Draw AI workspace" className="animate-panel-in absolute top-4 bottom-4 left-[76px] z-20 flex w-[288px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1e1d23] text-white shadow-[var(--shadow-xl)]">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-3.5">
        <div className="flex items-center gap-2 text-[13px] font-semibold"><Sparkles className="size-4 text-[#b7a4ff]" />Draw AI</div>
        <button type="button" onClick={onCollapse} aria-label="Collapse Draw AI" className="focus-ring flex size-7 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"><PanelLeft className="size-4" /></button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3.5 py-5">
        {submittedPrompt ? (
          <div className="space-y-3" aria-live="polite">
            <div className="ml-7 rounded-xl rounded-tr-sm bg-white/10 px-3 py-2.5 text-[12px] leading-relaxed text-white/90 break-words">{submittedPrompt}</div>
            <div className="flex gap-2 text-[11px] leading-relaxed text-white/65"><Sparkles className="mt-0.5 size-3.5 shrink-0 text-[#b7a4ff]" /><span>Diagram generation is not available yet. Your prompt was not sent.</span></div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1.5 text-center">
              <div className="mx-auto flex size-9 items-center justify-center rounded-xl bg-[#8f79e8]/15 text-[#b7a4ff]"><Sparkles className="size-5" /></div>
              <h2 className="text-[14px] font-semibold tracking-tight">What would you like to create?</h2>
              <p className="text-[11px] leading-relaxed text-white/55">Choose a diagram type, then describe your idea.</p>
            </div>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Diagram type">
              {diagramTypes.map(({ label, icon: Icon }) => (
                <button key={label} type="button" aria-pressed={diagramType === label} onClick={() => setDiagramType(label)} className={`focus-ring flex min-h-[76px] flex-col items-start justify-between rounded-xl border p-2.5 text-left text-[11px] font-medium leading-tight transition-colors ${diagramType === label ? 'border-[#a992ff]/70 bg-[#8f79e8]/15 text-white' : 'border-white/10 bg-white/[0.035] text-white/75 hover:border-white/25 hover:bg-white/[0.07]'}`}>
                  <Icon className={`size-[18px] ${diagramType === label ? 'text-[#b7a4ff]' : 'text-white/60'}`} strokeWidth={1.7} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-white/45">Start with a short description. You can refine the details as you go.</p>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 bg-[#1a191f] p-3">
        <label htmlFor="draw-ai-model" className="mb-2 flex items-center justify-between text-[10px] font-medium text-white/55"><span>Model</span><span>Preview only</span></label>
        <div className="relative mb-3">
          <select id="draw-ai-model" value={model} onChange={(event) => setModel(event.target.value as Model)} className="focus-ring w-full appearance-none rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 pr-8 text-[11px] font-medium text-white outline-none cursor-pointer">
            <option value="Fast" className="bg-[#1e1d23]">Fast</option>
            <option value="Balanced" className="bg-[#1e1d23]">Balanced</option>
            <option value="Best" className="bg-[#1e1d23]">Best</option>
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-2.5 size-3.5 text-white/60" />
        </div>
        <form onSubmit={submitPrompt} className="rounded-xl border border-[#a992ff]/55 bg-white/[0.05] p-2 focus-within:border-[#b7a4ff] focus-within:ring-1 focus-within:ring-[#b7a4ff]/30">
          <label htmlFor="draw-ai-prompt" className="sr-only">Describe your diagram</label>
          <textarea id="draw-ai-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={handlePromptKeyDown} rows={3} placeholder={`Describe your ${diagramType.toLowerCase()}...`} className="w-full resize-none bg-transparent px-1 text-[12px] leading-relaxed text-white outline-none placeholder:text-white/40" />
          <div className="flex items-center justify-between px-1"><span className="text-[10px] text-white/40">Enter to send · Shift+Enter for a line</span><button type="submit" disabled={!prompt.trim()} aria-label="Send prompt" className="focus-ring flex size-7 items-center justify-center rounded-lg bg-[#8f79e8] text-white hover:bg-[#a38ef2] disabled:cursor-not-allowed disabled:opacity-40"><ArrowUp className="size-4" /></button></div>
        </form>
      </div>
    </section>
  );
}
