'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  X,
  Table,
  Key,
  Box,
  User,
  Database,
  Split,
  RefreshCw,
  CheckSquare,
} from 'lucide-react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { useIsNarrow } from '@/hooks/useMediaQuery';
import { NODE_REGISTRY, getNodesByCategory } from './node-registry';
import { NODE_ENV_META, NODE_STATUS_META } from './BaseSystemNode';
import { EDGE_REGISTRY } from '@/components/edges/edge-registry';
import {
  NODE_ENVIRONMENTS,
  NODE_STATUSES,
  type NodeEnvironment,
  type SystemNodeData,
  type SystemNodeType,
  type ERColumn,
  type SystemNode,
} from '@/types';
import { SYSTEM_DESIGN_STEPS, getStepConfig } from '@/lib/steps-registry';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { SuggestionTag, Tag } from '@/components/ui/tag';
import { Segmented } from '@/components/ui/segmented';
import { IconChip, Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/ui/panel';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const TYPE_GROUPS = getNodesByCategory()
  .map((group) => ({
    ...group,
    types: group.types.filter(({ type }) => type !== 'group'),
  }))
  .filter((group) => group.types.length > 0);

const ENV_OPTIONS: { value: 'none' | NodeEnvironment; label: string }[] = [
  { value: 'none', label: 'None' },
  ...NODE_ENVIRONMENTS.map((env) => ({ value: env, label: NODE_ENV_META[env].label })),
];

const FOCUS_RING = 'outline-none focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--accent-soft)]';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[12px] leading-4 font-medium text-ink-2">{children}</span>;
}

/** Only http(s)/mailto links are clickable; bare hosts get https://. */
function safeHref(url: string) {
  const trimmed = url.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return undefined;
  return `https://${trimmed}`;
}

function TechStackField({
  value,
  suggestions,
  onChange,
}: {
  value: string[];
  suggestions: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const has = (tech: string) => value.some((t) => t.toLowerCase() === tech.toLowerCase());

  const add = (raw: string) => {
    const tech = raw.replace(/,/g, '').trim();
    setDraft('');
    if (!tech || has(tech)) return;
    onChange([...value, tech]);
  };

  const visibleSuggestions = suggestions.filter((s) => !has(s)).slice(0, 3);

  return (
    <div className="grid gap-1.5">
      <SectionLabel>Tech stack</SectionLabel>
      <div
        className="flex min-h-9 cursor-text flex-wrap items-center gap-1.5 rounded-[9px] border border-line p-1.5 transition-[border-color,box-shadow] duration-[120ms] focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-soft)]"
        onClick={(e) => {
          if (e.target === e.currentTarget) inputRef.current?.focus();
        }}
      >
        {value.map((tech, i) => (
          <Tag key={`${tech}-${i}`} onRemove={() => onChange(value.filter((_, j) => j !== i))}>
            {tech}
          </Tag>
        ))}
        <input
          ref={inputRef}
          aria-label="Add technology"
          value={draft}
          placeholder="Add…"
          className="h-6 min-w-[60px] flex-1 bg-transparent px-1 text-[13px] text-ink outline-none placeholder:text-ink-3"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => add(draft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
        />
      </div>
      {visibleSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleSuggestions.map((tech) => (
            <SuggestionTag key={tech} onClick={() => add(tech)}>
              {tech}
            </SuggestionTag>
          ))}
        </div>
      )}
    </div>
  );
}

function MoreDetails({
  data,
  onChange,
}: {
  data: SystemNodeData;
  onChange: (patch: Partial<SystemNodeData>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const links = data.links ?? [];
  const setCount = [data.status, data.environment, data.owner, links.length].filter(Boolean).length;

  const addLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    onChange({ links: [...links, { label: linkLabel.trim() || 'Link', url }] });
    setLinkLabel('');
    setLinkUrl('');
  };

  return (
    <div className="grid gap-3.5 border-t border-line-2 pt-3.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="-mx-1 flex h-6 items-center gap-1.5 rounded-[6px] px-1 text-left text-[12px] font-medium text-ink-2 transition-colors duration-[120ms] outline-none hover:text-ink focus-visible:shadow-[0_0_0_3px_var(--accent-soft)]"
      >
        <ChevronRight
          className={cn('size-3.5 text-ink-3 transition-transform duration-[120ms]', open && 'rotate-90')}
        />
        More details
        {!open && setCount > 0 && <span className="font-mono text-[11px] font-normal text-ink-3">{setCount} set</span>}
      </button>

      {open && (
        <>
          <div className="grid gap-1.5">
            <SectionLabel>Status</SectionLabel>
            <div className="grid grid-cols-2 gap-1">
              {[undefined, ...NODE_STATUSES].map((status) => {
                const current = data.status === status;
                return (
                  <button
                    key={status ?? 'none'}
                    type="button"
                    aria-pressed={current}
                    onClick={() => onChange({ status })}
                    className={cn(
                      'flex h-8 items-center gap-2 rounded-[9px] border px-2.5 text-left text-[12.5px] whitespace-nowrap text-ink transition-colors duration-[120ms]',
                      FOCUS_RING,
                      current ? 'border-accent bg-accent-soft font-semibold' : 'border-line bg-paper hover:border-ink-3'
                    )}
                  >
                    <span
                      className={cn(
                        'size-2 shrink-0 rounded-full',
                        status ? NODE_STATUS_META[status].dot : 'border border-ink-3'
                      )}
                    />
                    {status ? NODE_STATUS_META[status].label : 'None'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-1.5">
            <SectionLabel>Environment</SectionLabel>
            <Segmented
              aria-label="Environment"
              size="sm"
              className="flex w-full [&>button]:flex-1"
              value={data.environment ?? 'none'}
              options={ENV_OPTIONS}
              onValueChange={(env) => onChange({ environment: env === 'none' ? undefined : env })}
            />
          </div>

          <Field label="Owner / team">
            <Input
              value={data.owner ?? ''}
              placeholder="e.g. Platform Team, @alice"
              onChange={(e) => onChange({ owner: e.target.value })}
            />
          </Field>

          <div className="grid gap-1.5">
            <SectionLabel>Links</SectionLabel>
            {links.length > 0 && (
              <div className="grid gap-0.5">
                {links.map((link, i) => {
                  const href = safeHref(link.url);
                  return (
                    <div key={`${link.url}-${i}`} className="group/link flex h-7 items-center gap-2 text-[12.5px]">
                      <ExternalLink className="size-3 shrink-0 text-ink-3" />
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={link.url}
                        className="min-w-0 flex-1 truncate text-ink hover:text-accent hover:underline"
                      >
                        {link.label || link.url}
                      </a>
                      <Button
                        variant="icon"
                        size="icon-sm"
                        aria-label={`Remove ${link.label || 'link'}`}
                        className="text-ink-3 opacity-0 group-hover/link:opacity-100 focus-visible:opacity-100"
                        onClick={() => onChange({ links: links.filter((_, j) => j !== i) })}
                      >
                        <X />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-1.5">
              <Input
                aria-label="Link label"
                value={linkLabel}
                placeholder="Label"
                className="h-8 w-[84px] shrink-0 text-[12.5px]"
                onChange={(e) => setLinkLabel(e.target.value)}
              />
              <Input
                aria-label="Link URL"
                value={linkUrl}
                placeholder="https://…"
                className="h-8 text-[12.5px]"
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addLink();
                }}
              />
              <Button variant="secondary" size="icon" aria-label="Add link" disabled={!linkUrl.trim()} onClick={addLink}>
                <Plus />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ERTableEditorContent({ node, onClose }: { node: SystemNode; onClose: () => void }) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const duplicateNodes = useCanvasStore((s) => s.duplicateNodes);
  const edges = useCanvasStore((s) => s.edges);
  const nodes = useCanvasStore((s) => s.nodes);
  const deleteEdge = useCanvasStore((s) => s.deleteEdge);

  const data = node.data;
  const columns: ERColumn[] = data.columns || [];

  const updateCol = (colId: string, patch: Partial<ERColumn>) => {
    const nextCols = columns.map((c) => (c.id === colId ? { ...c, ...patch } : c));
    updateNodeData(node.id, { columns: nextCols });
  };

  const removeCol = (colId: string) => {
    updateNodeData(node.id, { columns: columns.filter((c) => c.id !== colId) });
  };

  const addCol = () => {
    const newCol: ERColumn = {
      id: `col-${Date.now()}`,
      name: `field_${columns.length + 1}`,
      type: 'VARCHAR',
      isPk: false,
      isFk: false,
      isNullable: true,
      isUnique: false,
    };
    updateNodeData(node.id, { columns: [...columns, newCol] });
  };

  const tableEdges = edges.filter((e) => e.source === node.id || e.target === node.id);

  return (
    <>
      <PanelHeader
        icon={
          <IconChip color={data.color || '#38bdf8'} size={32}>
            <Table className="size-4" />
          </IconChip>
        }
        title="Table Properties"
        subtitle={<span className="font-mono">{node.id}</span>}
        onClose={onClose}
      />

      <PanelBody className="space-y-4">
        {/* Table Name */}
        <Field label="Table Name">
          <Input
            value={data.label || ''}
            placeholder="e.g. Users"
            onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
          />
        </Field>

        {/* Columns Table */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-text">Columns</span>
            <span className="text-[10px] text-text-muted font-mono">{columns.length} columns</span>
          </div>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
            <div className="grid grid-cols-[1fr_75px_22px_22px_22px_22px_18px] items-center gap-1 text-[8.5px] font-semibold text-text-muted px-1">
              <span>NAME</span>
              <span>TYPE</span>
              <span title="Primary Key" className="text-center">PK</span>
              <span title="Foreign Key" className="text-center">FK</span>
              <span title="Nullable" className="text-center">NUL</span>
              <span title="Unique" className="text-center">UNQ</span>
              <span />
            </div>

            {columns.map((col) => (
              <div
                key={col.id}
                className="grid grid-cols-[1fr_75px_22px_22px_22px_22px_18px] items-center gap-1 bg-surface-2/60 border border-line/50 rounded-md p-1"
              >
                <input
                  value={col.name}
                  onChange={(e) => updateCol(col.id, { name: e.target.value })}
                  placeholder="name"
                  className="bg-transparent text-[11px] font-mono outline-none text-ink min-w-0"
                />
                <select
                  value={(col.type || 'VARCHAR').toUpperCase()}
                  onChange={(e) => updateCol(col.id, { type: e.target.value })}
                  className="bg-paper border border-line rounded text-[9.5px] font-mono px-1 py-0.5 outline-none text-ink"
                >
                  <option value="UUID">UUID</option>
                  <option value="VARCHAR">VARCHAR</option>
                  <option value="INT">INT</option>
                  <option value="DECIMAL">DECIMAL</option>
                  <option value="TIMESTAMP">TIMESTAMP</option>
                  <option value="BOOLEAN">BOOLEAN</option>
                  <option value="TEXT">TEXT</option>
                  <option value="JSON">JSON</option>
                </select>
                <input
                  type="checkbox"
                  checked={!!col.isPk}
                  onChange={(e) => updateCol(col.id, { isPk: e.target.checked })}
                  className="size-3.5 accent-[#a855f7] cursor-pointer"
                  title="Primary Key"
                />
                <input
                  type="checkbox"
                  checked={!!col.isFk}
                  onChange={(e) => updateCol(col.id, { isFk: e.target.checked })}
                  className="size-3.5 accent-[#a855f7] cursor-pointer"
                  title="Foreign Key"
                />
                <input
                  type="checkbox"
                  checked={!!col.isNullable}
                  onChange={(e) => updateCol(col.id, { isNullable: e.target.checked })}
                  className="size-3.5 accent-accent cursor-pointer"
                  title="Nullable"
                />
                <input
                  type="checkbox"
                  checked={!!col.isUnique}
                  onChange={(e) => updateCol(col.id, { isUnique: e.target.checked })}
                  className="size-3.5 accent-[#3b82f6] cursor-pointer"
                  title="Unique"
                />
                <button
                  type="button"
                  onClick={() => removeCol(col.id)}
                  className="text-text-muted hover:text-danger cursor-pointer transition-colors"
                  title="Delete column"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>

          <Button variant="secondary" size="sm" onClick={addCol} className="w-full text-xs">
            <Plus className="size-3.5" />
            Add Column
          </Button>
        </div>

        {/* Table Settings */}
        <div className="grid gap-2 border-t border-line/60 pt-3">
          <span className="text-[12px] font-semibold text-text">Table Settings</span>

          {/* Color */}
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] text-text-muted">Color</span>
            <div className="flex items-center gap-1.5">
              {['#38bdf8', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#64748b'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateNodeData(node.id, { color: c })}
                  className={cn(
                    'size-5 rounded-full border-2 transition-transform cursor-pointer',
                    (data.color || '#38bdf8') === c ? 'scale-110 border-accent' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <Field label="Description">
            <Textarea
              rows={2}
              value={data.description || ''}
              placeholder="Application users of the system..."
              onChange={(e) => updateNodeData(node.id, { description: e.target.value })}
            />
          </Field>
        </div>

        {/* Relationships */}
        <div className="grid gap-2 border-t border-line/60 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-text">
              Relationships ({tableEdges.length})
            </span>
          </div>

          {tableEdges.length === 0 ? (
            <p className="text-[11px] text-text-muted italic">No relationships yet.</p>
          ) : (
            <div className="space-y-1.5">
              {tableEdges.map((e) => {
                const isSource = e.source === node.id;
                const otherNode = nodes.find((n) => n.id === (isSource ? e.target : e.source));
                const label = e.data?.relationshipType
                  ? e.data.relationshipType === 'one-to-one'
                    ? 'One to One (1:1)'
                    : e.data.relationshipType === 'many-to-many'
                      ? 'Many to Many (M:N)'
                      : 'One to Many (1:N)'
                  : e.data?.label || '1 : N';

                return (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-lg border border-line bg-surface-1 px-2.5 py-1.5"
                  >
                    <div>
                      <div className="text-[11px] font-semibold text-text">
                        {data.label || 'Table'} → {otherNode?.data.label || 'Table'}
                      </div>
                      <div className="text-[9.5px] font-mono text-accent">{label}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteEdge(e.id)}
                      className="text-text-muted hover:text-danger cursor-pointer p-1"
                      title="Delete relationship"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PanelBody>

      <PanelFooter>
        <Button variant="secondary" size="sm" onClick={() => duplicateNodes([node.id])}>
          <Copy />
          Duplicate
        </Button>
        <Button variant="danger" size="sm" className="ml-auto" onClick={() => deleteNode(node.id)}>
          <Trash2 />
          Delete
        </Button>
      </PanelFooter>
    </>
  );
}

function SequenceParticipantEditorContent({ node, onClose }: { node: SystemNode; onClose: () => void }) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const duplicateNodes = useCanvasStore((s) => s.duplicateNodes);

  const data = node.data;
  const participantType = data.participantType || 'service';
  const color = data.color || (participantType === 'actor' ? '#a855f7' : participantType === 'database' ? '#06b6d4' : '#22c55e');

  const Icon = participantType === 'actor' ? User : participantType === 'database' ? Database : Box;

  return (
    <>
      <PanelHeader
        icon={
          <IconChip color={color} size={32}>
            <Icon className="size-4" />
          </IconChip>
        }
        title="Participant Properties"
        subtitle={<span className="font-mono">{node.id}</span>}
        onClose={onClose}
      />

      <PanelBody className="space-y-4">
        {/* Label */}
        <Field label="Participant Name">
          <Input
            value={data.label || ''}
            placeholder="e.g. Auth Service"
            onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
          />
        </Field>

        {/* Participant Type */}
        <div className="grid gap-1.5">
          <SectionLabel>Participant Type</SectionLabel>
          <div className="grid grid-cols-3 gap-1">
            {(['actor', 'service', 'database'] as const).map((pt) => {
              const active = participantType === pt;
              const defaultColor = pt === 'actor' ? '#a855f7' : pt === 'database' ? '#06b6d4' : '#22c55e';
              return (
                <button
                  key={pt}
                  type="button"
                  onClick={() => updateNodeData(node.id, { participantType: pt, color: defaultColor })}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all cursor-pointer',
                    active
                      ? 'border-accent bg-accent/15 text-accent shadow-xs'
                      : 'border-line bg-paper text-text-muted hover:text-text'
                  )}
                >
                  {pt === 'actor' ? <User className="size-3.5" /> : pt === 'database' ? <Database className="size-3.5" /> : <Box className="size-3.5" />}
                  {pt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Color */}
        <div className="flex items-center justify-between">
          <SectionLabel>Theme Color</SectionLabel>
          <div className="flex items-center gap-1.5">
            {['#a855f7', '#38bdf8', '#22c55e', '#ec4899', '#f59e0b', '#06b6d4'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => updateNodeData(node.id, { color: c })}
                className={cn(
                  'size-5 rounded-full border-2 transition-transform cursor-pointer',
                  color === c ? 'scale-110 border-accent' : 'border-transparent'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Lifeline Length */}
        <Field label={`Lifeline Length (${data.lifelineLength || 360}px)`}>
          <input
            type="range"
            min={200}
            max={800}
            step={20}
            value={data.lifelineLength || 360}
            onChange={(e) => updateNodeData(node.id, { lifelineLength: Number(e.target.value) })}
            className="w-full accent-accent cursor-pointer"
          />
        </Field>

        {/* Description / Notes */}
        <Field label="Notes & Responsibilities">
          <Textarea
            rows={3}
            value={data.description || ''}
            placeholder="Responsible for user authentication and JWT validation..."
            onChange={(e) => updateNodeData(node.id, { description: e.target.value })}
          />
        </Field>
      </PanelBody>

      <PanelFooter>
        <Button variant="secondary" size="sm" onClick={() => duplicateNodes([node.id])}>
          <Copy />
          Duplicate
        </Button>
        <Button variant="danger" size="sm" className="ml-auto" onClick={() => deleteNode(node.id)}>
          <Trash2 />
          Delete
        </Button>
      </PanelFooter>
    </>
  );
}

function SequenceFragmentEditorContent({ node, onClose }: { node: SystemNode; onClose: () => void }) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const duplicateNodes = useCanvasStore((s) => s.duplicateNodes);

  const data = node.data;
  const fragmentType = data.fragmentType || 'alt';
  const color = data.color || (fragmentType === 'alt' ? '#f59e0b' : fragmentType === 'loop' ? '#10b981' : '#06b6d4');

  return (
    <>
      <PanelHeader
        icon={
          <IconChip color={color} size={32}>
            <Split className="size-4" />
          </IconChip>
        }
        title="Fragment Properties"
        subtitle={<span className="font-mono">{node.id}</span>}
        onClose={onClose}
      />

      <PanelBody className="space-y-4">
        {/* Operator Type */}
        <div className="grid gap-1.5">
          <SectionLabel>Operator Type</SectionLabel>
          <div className="grid grid-cols-4 gap-1">
            {(['alt', 'opt', 'loop', 'par'] as const).map((ft) => {
              const active = fragmentType === ft;
              const defColor = ft === 'alt' ? '#f59e0b' : ft === 'loop' ? '#10b981' : ft === 'opt' ? '#06b6d4' : '#8b5cf6';
              return (
                <button
                  key={ft}
                  type="button"
                  onClick={() => updateNodeData(node.id, { fragmentType: ft, color: defColor })}
                  className={cn(
                    'py-1.5 rounded-lg border text-xs font-bold uppercase transition-all cursor-pointer text-center',
                    active
                      ? 'border-accent bg-accent/15 text-accent shadow-xs'
                      : 'border-line bg-paper text-text-muted hover:text-text'
                  )}
                >
                  {ft}
                </button>
              );
            })}
          </div>
        </div>

        {/* Condition Text */}
        <Field label="Condition Expression">
          <Input
            value={data.fragmentCondition || data.label || ''}
            placeholder="e.g. [valid credentials]"
            onChange={(e) => updateNodeData(node.id, { label: e.target.value, fragmentCondition: e.target.value })}
          />
        </Field>

        {/* Color */}
        <div className="flex items-center justify-between">
          <SectionLabel>Accent Color</SectionLabel>
          <div className="flex items-center gap-1.5">
            {['#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => updateNodeData(node.id, { color: c })}
                className={cn(
                  'size-5 rounded-full border-2 transition-transform cursor-pointer',
                  color === c ? 'scale-110 border-accent' : 'border-transparent'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Description */}
        <Field label="Description">
          <Textarea
            rows={2}
            value={data.description || ''}
            placeholder="Alternative path when credentials are valid vs invalid..."
            onChange={(e) => updateNodeData(node.id, { description: e.target.value })}
          />
        </Field>
      </PanelBody>

      <PanelFooter>
        <Button variant="secondary" size="sm" onClick={() => duplicateNodes([node.id])}>
          <Copy />
          Duplicate
        </Button>
        <Button variant="danger" size="sm" className="ml-auto" onClick={() => deleteNode(node.id)}>
          <Trash2 />
          Delete
        </Button>
      </PanelFooter>
    </>
  );
}

function NodeEditorContent({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const node = useCanvasStore((s) => s.nodes.find((n) => n.id === nodeId));
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const duplicateNodes = useCanvasStore((s) => s.duplicateNodes);
  const setSelectedEdgeId = useCanvasStore((s) => s.setSelectedEdgeId);

  const connections = useMemo(() => {
    const labels = new Map(nodes.map((n) => [n.id, n.data.label]));
    return edges
      .filter((e) => e.source === nodeId || e.target === nodeId)
      .map((e) => {
        const outgoing = e.source === nodeId;
        const type = e.data?.edgeType ?? 'rest';
        return {
          id: e.id,
          outgoing,
          name: labels.get(outgoing ? e.target : e.source) || 'Untitled',
          protocol: e.data?.label || (EDGE_REGISTRY[type] ?? EDGE_REGISTRY.rest).label,
        };
      });
  }, [nodes, edges, nodeId]);

  if (!node) return null;

  if (node.type === 'er-table') {
    return <ERTableEditorContent node={node} onClose={onClose} />;
  }

  if (node.type === 'sequence-participant') {
    return <SequenceParticipantEditorContent node={node} onClose={onClose} />;
  }

  if (node.type === 'sequence-fragment') {
    return <SequenceFragmentEditorContent node={node} onClose={onClose} />;
  }

  const data = node.data;
  const update = (patch: Partial<SystemNodeData>) => updateNodeData(nodeId, patch);
  const isStep = node.type === 'step' || Boolean(data.stepId);

  if (isStep) {
    const stepConfig =
      (data.stepId ? getStepConfig(data.stepId) : undefined) ??
      SYSTEM_DESIGN_STEPS.find(
        (s) => s.title.toLowerCase() === (data.label || '').toLowerCase()
      ) ??
      SYSTEM_DESIGN_STEPS[0];
    const StepIcon = stepConfig.icon;

    return (
      <>
        <PanelHeader
          icon={
            <IconChip color="#8b5cf6" size={32}>
              <StepIcon className="size-4" />
            </IconChip>
          }
          title={data.stepTitle || data.label || stepConfig.title}
          subtitle={
            <>
              System Design Step · <span className="font-mono">{nodeId}</span>
            </>
          }
          onClose={onClose}
        />

        <PanelBody>
          <div className="grid gap-1.5">
            <SectionLabel>Design Step</SectionLabel>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 w-full items-center gap-2.5 rounded-[9px] border border-line bg-paper pr-2.5 pl-2 text-left text-[13.5px] text-ink transition-[border-color,box-shadow] duration-[120ms] outline-none hover:border-ink-3 focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--accent-soft)] data-[state=open]:border-accent data-[state=open]:shadow-[0_0_0_3px_var(--accent-soft)]"
                >
                  <IconChip color="#8b5cf6" size={22}>
                    <StepIcon className="size-3.5" />
                  </IconChip>
                  <span className="flex-1 truncate">{stepConfig.title}</span>
                  <ChevronDown className="size-3.5 text-ink-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-h-[min(380px,var(--radix-dropdown-menu-content-available-height))] w-[var(--radix-dropdown-menu-trigger-width)]"
              >
                <DropdownMenuLabel>System Design Steps</DropdownMenuLabel>
                {SYSTEM_DESIGN_STEPS.map((s) => {
                  const CurrentIcon = s.icon;
                  const isSelected = s.id === (data.stepId || stepConfig.id);
                  return (
                    <DropdownMenuItem
                      key={s.id}
                      onSelect={() => {
                        update({
                          stepId: s.id,
                          stepNumber: s.stepNumber,
                          stepTitle: s.title,
                          label: s.title,
                          stepDescription: s.subtitle,
                          description: s.subtitle,
                        });
                      }}
                    >
                      <IconChip color="#8b5cf6" size={22}>
                        <CurrentIcon className="size-3.5" />
                      </IconChip>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate font-medium">{s.title}</span>
                        <span className="truncate text-[10.5px] text-ink-3">{s.subtitle}</span>
                      </div>
                      {isSelected && <Check className="size-3.5 text-accent" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Field label="Title">
            <Input
              value={data.stepTitle ?? data.label ?? ''}
              placeholder="Step title"
              onChange={(e) => update({ label: e.target.value, stepTitle: e.target.value })}
            />
          </Field>

          <Field label="Subtitle / Scope">
            <Textarea
              rows={2}
              value={data.stepDescription ?? data.description ?? ''}
              placeholder="Short summary of this step"
              onChange={(e) => update({ description: e.target.value, stepDescription: e.target.value })}
            />
          </Field>

          <Field label="Documentation Content">
            <Textarea
              rows={6}
              value={data.stepContent ?? ''}
              placeholder="Markdown documentation or architecture details..."
              onChange={(e) => update({ stepContent: e.target.value })}
              className="font-mono text-[12px] leading-relaxed"
            />
          </Field>

          <Field label="Presentation note">
            <Textarea
              rows={2}
              value={data.story ?? ''}
              placeholder="Shown on the story card when presenting"
              onChange={(e) => update({ story: e.target.value })}
            />
          </Field>

          <div className="grid gap-1.5">
            <SectionLabel>Connections</SectionLabel>
            {connections.length === 0 ? (
              <span className="text-[12.5px] text-ink-3">No connections yet</span>
            ) : (
              <div className="-mx-1.5 grid gap-0.5">
                {connections.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedEdgeId(c.id)}
                    className="flex h-7 items-center gap-2 rounded-[7px] px-1.5 text-left text-[12.5px] text-ink transition-colors duration-[120ms] outline-none hover:bg-line-2 focus-visible:shadow-[0_0_0_3px_var(--accent-soft)]"
                  >
                    <span className="text-ink-3" aria-label={c.outgoing ? 'Outgoing' : 'Incoming'}>
                      {c.outgoing ? '→' : '←'}
                    </span>
                    <span className="min-w-0 truncate font-medium">{c.name}</span>
                    <span className="ml-auto shrink-0 rounded-full border border-line px-2 py-px text-[10.5px] leading-[14px] whitespace-nowrap text-ink-2">
                      {c.protocol}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </PanelBody>

        <PanelFooter>
          <Button variant="secondary" size="sm" onClick={() => duplicateNodes([nodeId])}>
            <Copy />
            Duplicate
          </Button>
          <Button variant="danger" size="sm" className="ml-auto" onClick={() => deleteNode(nodeId)}>
            <Trash2 />
            Delete
          </Button>
        </PanelFooter>
      </>
    );
  }

  const config = NODE_REGISTRY[data.nodeType] ?? NODE_REGISTRY.service;
  const Icon = config.icon;

  const handleTypeChange = (nodeType: SystemNodeType) => {
    if (nodeType === data.nodeType) return;
    const techStack = data.techStack ?? [];
    update({
      nodeType,
      techStack: techStack.length === 0 ? [...NODE_REGISTRY[nodeType].defaultTechStack] : techStack,
    });
  };

  return (
    <>
      <PanelHeader
        icon={
          <IconChip color={config.color} size={32}>
            <Icon className="size-4" />
          </IconChip>
        }
        title={data.label || 'Untitled'}
        subtitle={
          <>
            {config.label} · <span className="font-mono">{nodeId}</span>
          </>
        }
        onClose={onClose}
      />

      <PanelBody>
        <Field label="Name">
          <Input value={data.label} onChange={(e) => update({ label: e.target.value })} />
        </Field>

        <div className="grid gap-1.5">
          <SectionLabel>Type</SectionLabel>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 w-full items-center gap-2.5 rounded-[9px] border border-line bg-paper pr-2.5 pl-2 text-left text-[13.5px] text-ink transition-[border-color,box-shadow] duration-[120ms] outline-none hover:border-ink-3 focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--accent-soft)] data-[state=open]:border-accent data-[state=open]:shadow-[0_0_0_3px_var(--accent-soft)]"
              >
                <IconChip color={config.color} size={22}>
                  <Icon className="size-3.5" />
                </IconChip>
                <span className="flex-1 truncate">{config.label}</span>
                <ChevronDown className="size-3.5 text-ink-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-[min(440px,var(--radix-dropdown-menu-content-available-height))] w-[var(--radix-dropdown-menu-trigger-width)]"
            >
              {TYPE_GROUPS.map(({ category, types }, i) => (
                <DropdownMenuGroup key={category}>
                  {i > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel>{category}</DropdownMenuLabel>
                  {types.map(({ type, config: c }) => {
                    const TypeIcon = c.icon;
                    const current = type === data.nodeType;
                    return (
                      <DropdownMenuItem key={type} onSelect={() => handleTypeChange(type)}>
                        <IconChip color={c.color} size={22}>
                          <TypeIcon className="size-3.5" style={{ color: c.color }} />
                        </IconChip>
                        <span className="flex-1 truncate">{c.label}</span>
                        {current && <Check className="size-3.5 text-accent" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <TechStackField
          value={data.techStack ?? []}
          suggestions={config.suggestedTech}
          onChange={(techStack) => update({ techStack })}
        />

        <Field label="Description">
          <Textarea
            rows={3}
            value={data.description ?? ''}
            placeholder="What does this component do?"
            onChange={(e) => update({ description: e.target.value })}
          />
        </Field>

        <Field label="Presentation note">
          <Textarea
            rows={2}
            value={data.story ?? ''}
            placeholder="Shown on the story card when presenting"
            onChange={(e) => update({ story: e.target.value })}
          />
        </Field>

        <div className="grid gap-1.5">
          <SectionLabel>Connections</SectionLabel>
          {connections.length === 0 ? (
            <span className="text-[12.5px] text-ink-3">No connections yet</span>
          ) : (
            <div className="-mx-1.5 grid gap-0.5">
              {connections.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedEdgeId(c.id)}
                  className="flex h-7 items-center gap-2 rounded-[7px] px-1.5 text-left text-[12.5px] text-ink transition-colors duration-[120ms] outline-none hover:bg-line-2 focus-visible:shadow-[0_0_0_3px_var(--accent-soft)]"
                >
                  <span className="text-ink-3" aria-label={c.outgoing ? 'Outgoing' : 'Incoming'}>
                    {c.outgoing ? '→' : '←'}
                  </span>
                  <span className="min-w-0 truncate font-medium">{c.name}</span>
                  <span className="ml-auto shrink-0 rounded-full border border-line px-2 py-px text-[10.5px] leading-[14px] whitespace-nowrap text-ink-2">
                    {c.protocol}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <MoreDetails data={data} onChange={update} />
      </PanelBody>

      <PanelFooter>
        <Button variant="secondary" size="sm" onClick={() => duplicateNodes([nodeId])}>
          <Copy />
          Duplicate
        </Button>
        <Button variant="danger" size="sm" className="ml-auto" onClick={() => deleteNode(nodeId)}>
          <Trash2 />
          Delete
        </Button>
      </PanelFooter>
    </>
  );
}

/**
 * Editor for the selected component. Floating panel on desktop, right drawer on narrow screens.
 * Hidden for groups/notes, multi-selection and presentation mode.
 */
export function NodeEditor() {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const isOpen = useCanvasStore((s) => {
    if (s.presentation.active || !s.selectedNodeId) return false;
    const node = s.nodes.find((n) => n.id === s.selectedNodeId);
    if (!node || node.type === 'group' || node.type === 'note' || node.type === 'drawing' || node.type === 'shape' || node.type === 'text' || node.data.nodeType === 'group') return false;
    let selectedCount = 0;
    for (const n of s.nodes) {
      if (n.selected && ++selectedCount >= 2) return false;
    }
    if (s.edges.some((e) => e.selected)) return false;
    return true;
  });
  const setSelectedNodeId = useCanvasStore((s) => s.setSelectedNodeId);
  const isNarrow = useIsNarrow();

  if (!isOpen || !selectedNodeId) return null;

  const close = () => setSelectedNodeId(null);

  if (isNarrow) {
    return (
      <Sheet open onOpenChange={(open) => !open && close()}>
        <SheetContent side="right" aria-describedby={undefined}>
          <SheetTitle className="sr-only">Edit component</SheetTitle>
          <NodeEditorContent key={selectedNodeId} nodeId={selectedNodeId} onClose={close} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Panel
      role="dialog"
      aria-label="Edit component"
      className="animate-panel-in-right absolute top-4 right-4 bottom-4 z-20 flex w-[300px] flex-col overflow-hidden"
      onKeyDown={(e) => {
        // Radix menus prevent default on the Esc that closes them.
        if (e.key === 'Escape' && !e.defaultPrevented) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <NodeEditorContent key={selectedNodeId} nodeId={selectedNodeId} onClose={close} />
    </Panel>
  );
}
