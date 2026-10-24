'use client';

import { Activity, ArrowLeft, ArrowLeftRight, ArrowRight, Clock, FileJson, GitFork, Trash2 } from 'lucide-react';
import { useCanvasStore } from '@/features/canvas/stores/useCanvasStore';
import { useIsNarrow } from '@/shared/hooks/useMediaQuery';
import { EDGE_REGISTRY } from './edge-registry';
import { ProtocolSwatch } from './ProtocolPicker';
import { SYSTEM_EDGE_TYPES, type SystemEdgeData } from '@/features/canvas/types/canvas.types';
import { Button } from '@/shared/components/ui/button';
import { Input, Textarea } from '@/shared/components/ui/input';
import { Field } from '@/shared/components/ui/label';
import { Kbd } from '@/shared/components/ui/kbd';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/shared/components/ui/panel';
import { Sheet, SheetContent, SheetTitle } from '@/shared/components/ui/sheet';
import { cn, tint } from '@/shared/utils/utils';

const DETAILS = [
  { key: 'latency', label: 'Latency', icon: Clock, placeholder: 'e.g. ~50ms' },
  { key: 'dataFormat', label: 'Format', icon: FileJson, placeholder: 'e.g. Protobuf' },
  { key: 'throughput', label: 'Throughput', icon: Activity, placeholder: 'e.g. 1K req/s' },
] as const satisfies readonly { key: keyof SystemEdgeData; label: string; icon: unknown; placeholder: string }[];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[12px] leading-4 font-medium text-ink-2">{children}</span>;
}

/** Sequence Diagram Message Properties Editor */
function SequenceMessageEditorContent({ edgeId, onClose }: { edgeId: string; onClose: () => void }) {
  const edge = useCanvasStore((s) => s.edges.find((e) => e.id === edgeId));
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const setEdges = useCanvasStore((s) => s.setEdges);
  const updateEdgeData = useCanvasStore((s) => s.updateEdgeData);
  const deleteEdge = useCanvasStore((s) => s.deleteEdge);

  if (!edge) return null;

  const data: SystemEdgeData = edge.data ?? { edgeType: 'rest' };
  const update = (patch: Partial<SystemEdgeData>) => updateEdgeData(edgeId, patch);

  const participants = nodes.filter((n) => n.type === 'sequence-participant' || n.type === 'system');
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);

  const messageType = data.messageType || 'sync';
  const strokeStyle = data.strokeStyle || (messageType === 'sync' ? 'solid' : 'dashed');
  const arrowhead = data.arrowhead || (messageType === 'async' ? 'open' : 'filled');
  const color = data.color || '#3b82f6';
  const textSize = data.textSize || '14px';

  const handleSourceChange = (newSourceId: string) => {
    setEdges(edges.map((e) => (e.id === edgeId ? { ...e, source: newSourceId } : e)));
  };

  const handleTargetChange = (newTargetId: string) => {
    setEdges(edges.map((e) => (e.id === edgeId ? { ...e, target: newTargetId } : e)));
  };

  return (
    <>
      <PanelHeader
        icon={
          <span
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[9px]"
            style={{ background: tint(color) }}
          >
            {messageType === 'return' ? (
              <ArrowLeft className="size-4" style={{ color }} />
            ) : (
              <ArrowRight className="size-4" style={{ color }} />
            )}
          </span>
        }
        title="Message Properties"
        subtitle={<span className="font-mono">{sourceNode?.data.label || 'Source'} → {targetNode?.data.label || 'Target'}</span>}
        onClose={onClose}
      />

      <PanelBody className="space-y-4">
        {/* Label */}
        <Field label="Label">
          <Input
            value={data.label ?? ''}
            placeholder="e.g. Validate Token"
            onChange={(e) => update({ label: e.target.value })}
          />
        </Field>

        {/* Message Type */}
        <div className="grid gap-1.5">
          <SectionLabel>Message Type</SectionLabel>
          <div className="grid grid-cols-3 gap-1">
            {[
              { type: 'sync', label: 'Sync', icon: '→' },
              { type: 'async', label: 'Async', icon: '⇢' },
              { type: 'return', label: 'Return', icon: '⇠' },
            ].map(({ type, label, icon }) => {
              const checked = messageType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    update({
                      messageType: type as 'sync' | 'async' | 'return',
                      strokeStyle: type === 'sync' ? 'solid' : 'dashed',
                      arrowhead: type === 'async' ? 'open' : 'filled',
                    })
                  }
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 rounded-[9px] border py-1.5 text-center text-xs font-medium transition-colors cursor-pointer',
                    checked
                      ? 'border-accent bg-accent/15 text-accent font-semibold shadow-xs'
                      : 'border-line bg-paper text-text-muted hover:border-ink-3 hover:text-text'
                  )}
                >
                  <span className="text-sm font-bold">{icon}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Source Participant */}
        <div className="grid gap-1.5">
          <SectionLabel>Source Participant</SectionLabel>
          <select
            value={edge.source}
            onChange={(e) => handleSourceChange(e.target.value)}
            className="h-8 w-full rounded-[8px] border border-line bg-paper px-2 text-xs text-ink outline-none"
          >
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.data.label || p.id}
              </option>
            ))}
          </select>
        </div>

        {/* Target Participant */}
        <div className="grid gap-1.5">
          <SectionLabel>Target Participant</SectionLabel>
          <select
            value={edge.target}
            onChange={(e) => handleTargetChange(e.target.value)}
            className="h-8 w-full rounded-[8px] border border-line bg-paper px-2 text-xs text-ink outline-none"
          >
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.data.label || p.id}
              </option>
            ))}
          </select>
        </div>

        {/* Line Style */}
        <div className="grid gap-1.5">
          <SectionLabel>Line Style</SectionLabel>
          <select
            value={strokeStyle}
            onChange={(e) => update({ strokeStyle: e.target.value as 'solid' | 'dashed' | 'dotted' })}
            className="h-8 w-full rounded-[8px] border border-line bg-paper px-2 text-xs text-ink outline-none"
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </div>

        {/* Arrowhead */}
        <div className="grid gap-1.5">
          <SectionLabel>Arrowhead</SectionLabel>
          <select
            value={arrowhead}
            onChange={(e) => update({ arrowhead: e.target.value as 'filled' | 'open' | 'none' })}
            className="h-8 w-full rounded-[8px] border border-line bg-paper px-2 text-xs text-ink outline-none"
          >
            <option value="filled">Filled</option>
            <option value="open">Open</option>
            <option value="none">None</option>
          </select>
        </div>

        {/* Color */}
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <SectionLabel>Color</SectionLabel>
            <span className="font-mono text-[11px] text-text-muted">{color}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#64748B'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => update({ color: c })}
                className={cn(
                  'size-6 rounded-full border-2 transition-transform cursor-pointer',
                  color === c ? 'scale-110 border-accent shadow-xs' : 'border-transparent'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Text Size */}
        <div className="grid gap-1.5">
          <SectionLabel>Text Size</SectionLabel>
          <select
            value={textSize}
            onChange={(e) => update({ textSize: e.target.value })}
            className="h-8 w-full rounded-[8px] border border-line bg-paper px-2 text-xs text-ink outline-none"
          >
            <option value="11px">11px</option>
            <option value="12px">12px</option>
            <option value="14px">14px</option>
            <option value="16px">16px</option>
          </select>
        </div>

        {/* Notes */}
        <Field label="Notes">
          <Textarea
            rows={3}
            value={data.notes ?? data.description ?? ''}
            placeholder="API Gateway validates the JWT token with Auth Service."
            onChange={(e) => update({ notes: e.target.value, description: e.target.value })}
          />
        </Field>
      </PanelBody>

      <PanelFooter>
        <Button variant="danger" size="sm" className="ml-auto" onClick={() => deleteEdge(edgeId)}>
          <Trash2 className="size-3.5" />
          Delete Message
        </Button>
      </PanelFooter>
    </>
  );
}

/** ER Diagram Relationship Properties Editor */
function ERRelationshipEditorContent({ edgeId, onClose }: { edgeId: string; onClose: () => void }) {
  const edge = useCanvasStore((s) => s.edges.find((e) => e.id === edgeId));
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const setEdges = useCanvasStore((s) => s.setEdges);
  const updateEdgeData = useCanvasStore((s) => s.updateEdgeData);
  const deleteEdge = useCanvasStore((s) => s.deleteEdge);

  if (!edge) return null;

  const data: SystemEdgeData = edge.data ?? { edgeType: 'rest' };
  const update = (patch: Partial<SystemEdgeData>) => updateEdgeData(edgeId, patch);

  const tables = nodes.filter((n) => n.type === 'er-table');
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);

  const relType = data.relationshipType || 'one-to-many';
  const sourceCard = data.sourceCardinality || '1';
  const targetCard = data.targetCardinality || 'N';
  const strokeStyle = data.strokeStyle || 'solid';
  const color = data.color || '#64748b';

  const handleSourceChange = (newSourceId: string) => {
    setEdges(edges.map((e) => (e.id === edgeId ? { ...e, source: newSourceId } : e)));
  };

  const handleTargetChange = (newTargetId: string) => {
    setEdges(edges.map((e) => (e.id === edgeId ? { ...e, target: newTargetId } : e)));
  };

  return (
    <>
      <PanelHeader
        icon={
          <span
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[9px]"
            style={{ background: tint(color) }}
          >
            <GitFork className="size-4" style={{ color }} />
          </span>
        }
        title="Relationship Properties"
        subtitle={<span className="font-mono">{sourceNode?.data.label || 'Entity'} → {targetNode?.data.label || 'Entity'}</span>}
        onClose={onClose}
      />

      <PanelBody className="space-y-4">
        {/* Relationship Type */}
        <div className="grid gap-1.5">
          <SectionLabel>Cardinality</SectionLabel>
          <div className="grid grid-cols-3 gap-1">
            {[
              { type: 'one-to-one', label: '1 : 1', desc: 'One to One', s: '1', t: '1' },
              { type: 'one-to-many', label: '1 : N', desc: 'One to Many', s: '1', t: 'N' },
              { type: 'many-to-many', label: 'M : N', desc: 'Many to Many', s: 'N', t: 'N' },
            ].map(({ type, label, desc, s, t }) => {
              const checked = relType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    update({
                      relationshipType: type as 'one-to-one' | 'one-to-many' | 'many-to-many',
                      sourceCardinality: s,
                      targetCardinality: t,
                    })
                  }
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 rounded-[9px] border py-1.5 text-center text-xs font-medium transition-colors cursor-pointer',
                    checked
                      ? 'border-accent bg-accent/15 text-accent font-semibold shadow-xs'
                      : 'border-line bg-paper text-text-muted hover:border-ink-3 hover:text-text'
                  )}
                >
                  <span className="font-mono font-bold">{label}</span>
                  <span className="text-[10px] text-text-muted">{desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Source Entity */}
        <div className="grid gap-1.5">
          <SectionLabel>Source Entity</SectionLabel>
          <select
            value={edge.source}
            onChange={(e) => handleSourceChange(e.target.value)}
            className="h-8 w-full rounded-[8px] border border-line bg-paper px-2 text-xs text-ink outline-none"
          >
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.data.label || t.id}
              </option>
            ))}
          </select>
        </div>

        {/* Target Entity */}
        <div className="grid gap-1.5">
          <SectionLabel>Target Entity</SectionLabel>
          <select
            value={edge.target}
            onChange={(e) => handleTargetChange(e.target.value)}
            className="h-8 w-full rounded-[8px] border border-line bg-paper px-2 text-xs text-ink outline-none"
          >
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.data.label || t.id}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Cardinality Overrides */}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Source Cardinality">
            <Input
              value={sourceCard}
              placeholder="e.g. 1"
              onChange={(e) => update({ sourceCardinality: e.target.value })}
            />
          </Field>
          <Field label="Target Cardinality">
            <Input
              value={targetCard}
              placeholder="e.g. N"
              onChange={(e) => update({ targetCardinality: e.target.value })}
            />
          </Field>
        </div>

        {/* Line Style */}
        <div className="grid gap-1.5">
          <SectionLabel>Line Style</SectionLabel>
          <select
            value={strokeStyle}
            onChange={(e) => update({ strokeStyle: e.target.value as 'solid' | 'dashed' })}
            className="h-8 w-full rounded-[8px] border border-line bg-paper px-2 text-xs text-ink outline-none"
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
          </select>
        </div>

        {/* Color */}
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <SectionLabel>Color</SectionLabel>
            <span className="font-mono text-[11px] text-text-muted">{color}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {['#38BDF8', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#64748B'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => update({ color: c })}
                className={cn(
                  'size-6 rounded-full border-2 transition-transform cursor-pointer',
                  color === c ? 'scale-110 border-accent shadow-xs' : 'border-transparent'
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
            value={data.description ?? ''}
            placeholder="Describes foreign key relationship..."
            onChange={(e) => update({ description: e.target.value })}
          />
        </Field>
      </PanelBody>

      <PanelFooter>
        <Button variant="danger" size="sm" className="ml-auto" onClick={() => deleteEdge(edgeId)}>
          <Trash2 className="size-3.5" />
          Delete Relationship
        </Button>
      </PanelFooter>
    </>
  );
}

function ArchitectureEdgeEditorContent({ edgeId, onClose }: { edgeId: string; onClose: () => void }) {
  const edge = useCanvasStore((s) => s.edges.find((e) => e.id === edgeId));
  const sourceLabel = useCanvasStore((s) => s.nodes.find((n) => n.id === edge?.source)?.data.label);
  const targetLabel = useCanvasStore((s) => s.nodes.find((n) => n.id === edge?.target)?.data.label);
  const updateEdgeData = useCanvasStore((s) => s.updateEdgeData);
  const deleteEdge = useCanvasStore((s) => s.deleteEdge);
  const reverseEdge = useCanvasStore((s) => s.reverseEdge);

  if (!edge) return null;

  const data: SystemEdgeData = edge.data ?? { edgeType: 'rest' };
  const config = EDGE_REGISTRY[data.edgeType] ?? EDGE_REGISTRY.rest;
  const update = (patch: Partial<SystemEdgeData>) => updateEdgeData(edgeId, patch);

  return (
    <>
      <PanelHeader
        icon={
          <span
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[9px]"
            style={{ background: tint(config.color) }}
          >
            <span className="h-0.5 w-3.5 rounded-full" style={{ background: config.color }} />
          </span>
        }
        title={`${sourceLabel || 'Untitled'} → ${targetLabel || 'Untitled'}`}
        subtitle={
          <>
            Connection · <span className="font-mono">{edgeId}</span>
          </>
        }
        onClose={onClose}
      />

      <PanelBody>
        <Field label="Label">
          <Input value={data.label ?? ''} placeholder="e.g. HTTPS" onChange={(e) => update({ label: e.target.value })} />
        </Field>

        <div className="grid gap-1.5">
          <SectionLabel>Protocol</SectionLabel>
          <div role="radiogroup" aria-label="Protocol" className="grid grid-cols-2 gap-1">
            {SYSTEM_EDGE_TYPES.map((type) => {
              const checked = type === data.edgeType;
              return (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => !checked && update({ edgeType: type })}
                  className={cn(
                    'flex h-8 items-center gap-2 rounded-[9px] border px-2.5 text-left text-[12.5px] whitespace-nowrap text-ink transition-colors duration-[120ms] outline-none focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--accent-soft)]',
                    checked ? 'border-accent bg-accent-soft font-semibold' : 'border-line bg-paper hover:border-ink-3'
                  )}
                >
                  <ProtocolSwatch type={type} width={14} />
                  <span className="truncate">{EDGE_REGISTRY[type].label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Description">
          <Textarea
            rows={2}
            value={data.description ?? ''}
            placeholder="What does this connection do?"
            onChange={(e) => update({ description: e.target.value })}
          />
        </Field>

        <div className="grid gap-2">
          <SectionLabel>Details</SectionLabel>
          <div className="overflow-hidden rounded-[9px] border border-line">
            {DETAILS.map(({ key, label, icon: Icon, placeholder }, i) => (
              <label
                key={key}
                className={cn('grid h-9 grid-cols-[112px_1fr] items-center', i > 0 && 'border-t border-line-2')}
              >
                <span className="inline-flex items-center gap-[7px] pl-2.5 text-[12px] text-ink-2">
                  <Icon className="size-[13px] text-ink-3" />
                  {label}
                </span>
                <input
                  value={data[key] ?? ''}
                  placeholder={placeholder}
                  onChange={(e) => update({ [key]: e.target.value })}
                  className="h-full min-w-0 border-0 border-l border-line-2 bg-transparent px-2.5 font-mono text-[12px] text-ink transition-colors duration-[120ms] outline-none placeholder:text-ink-3 focus:bg-line-2"
                />
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => reverseEdge(edgeId)}
          className="flex w-full items-center gap-2 rounded-[9px] bg-line-2 px-3 py-2.5 text-left text-[12px] text-ink-2 transition-colors duration-[120ms] outline-none hover:text-ink focus-visible:shadow-[0_0_0_3px_var(--accent-soft)]"
        >
          <ArrowLeftRight className="size-3.5 text-ink-3" />
          <span className="flex-1">Reverse direction</span>
          <Kbd bare>⇧R</Kbd>
        </button>
      </PanelBody>

      <PanelFooter>
        <span className="text-[11.5px] text-ink-3">Shown on the edge as a pill label</span>
        <Button variant="danger" size="sm" className="ml-auto" onClick={() => deleteEdge(edgeId)}>
          <Trash2 />
          Delete
        </Button>
      </PanelFooter>
    </>
  );
}

function EdgeEditorContent({ edgeId, onClose }: { edgeId: string; onClose: () => void }) {
  const edge = useCanvasStore((s) => s.edges.find((e) => e.id === edgeId));
  const diagramType = useCanvasStore((s) => s.diagramType);
  const sourceNode = useCanvasStore((s) => s.nodes.find((n) => n.id === edge?.source));
  const targetNode = useCanvasStore((s) => s.nodes.find((n) => n.id === edge?.target));

  if (!edge) return null;

  const data: SystemEdgeData = edge.data ?? { edgeType: 'rest' };

  const isSequenceEdge =
    data.messageType !== undefined ||
    sourceNode?.type === 'sequence-participant' ||
    targetNode?.type === 'sequence-participant' ||
    (diagramType === 'sequence' && sourceNode?.type !== 'system');

  const isEREdge =
    data.relationshipType !== undefined ||
    data.sourceCardinality !== undefined ||
    data.targetCardinality !== undefined ||
    sourceNode?.type === 'er-table' ||
    targetNode?.type === 'er-table' ||
    (diagramType === 'er' && sourceNode?.type !== 'system');

  if (isSequenceEdge) {
    return <SequenceMessageEditorContent edgeId={edgeId} onClose={onClose} />;
  }

  if (isEREdge) {
    return <ERRelationshipEditorContent edgeId={edgeId} onClose={onClose} />;
  }

  return <ArchitectureEdgeEditorContent edgeId={edgeId} onClose={onClose} />;
}

/** Editor for the selected connection. Floating panel on desktop, right drawer on narrow screens. */
export function EdgeEditor() {
  const selectedEdgeId = useCanvasStore((s) => s.selectedEdgeId);
  const isOpen = useCanvasStore((s) => {
    if (s.presentation.active || !s.selectedEdgeId) return false;
    const selectedNodesCount = s.nodes.filter((n) => n.selected).length;
    const selectedEdgesCount = s.edges.filter((e) => e.selected).length;
    if (selectedNodesCount > 0 || selectedEdgesCount > 1) return false;
    return s.edges.some((e) => e.id === s.selectedEdgeId);
  });
  const setSelectedEdgeId = useCanvasStore((s) => s.setSelectedEdgeId);
  const isNarrow = useIsNarrow();

  if (!isOpen || !selectedEdgeId) return null;

  const close = () => setSelectedEdgeId(null);

  if (isNarrow) {
    return (
      <Sheet open onOpenChange={(open) => !open && close()}>
        <SheetContent side="right" aria-describedby={undefined}>
          <SheetTitle className="sr-only">Edit connection</SheetTitle>
          <EdgeEditorContent key={selectedEdgeId} edgeId={selectedEdgeId} onClose={close} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Panel
      role="dialog"
      aria-label="Edit connection"
      className="animate-panel-in-right absolute top-4 right-4 bottom-4 z-20 flex w-[300px] flex-col overflow-hidden"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !e.defaultPrevented) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <EdgeEditorContent key={selectedEdgeId} edgeId={selectedEdgeId} onClose={close} />
    </Panel>
  );
}
