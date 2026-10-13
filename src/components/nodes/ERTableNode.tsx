'use client';

import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Table, Plus, X, Layers, Binary } from 'lucide-react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { cn } from '@/lib/utils';
import type { SystemNode, ERColumn } from '@/types';

const DEFAULT_COLUMNS: ERColumn[] = [
  { id: 'col-1', name: 'id', type: 'UUID', isPk: true },
  { id: 'col-2', name: 'created_at', type: 'timestamp' },
];

function ERTableComponent({ id, data, selected }: NodeProps<SystemNode>) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(data.label || 'table_name');
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const columns: ERColumn[] = data.columns || DEFAULT_COLUMNS;
  const tableType = data.tableType || 'table';
  const color = data.color || (tableType === 'table' ? '#38bdf8' : tableType === 'view' ? '#8b5cf6' : '#10b981');

  const [prevLabel, setPrevLabel] = useState(data.label);
  if (prevLabel !== data.label) {
    setPrevLabel(data.label);
    if (!isEditingTitle) {
      setDraftTitle(data.label || 'table_name');
    }
  }

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  const commitTitle = () => {
    setIsEditingTitle(false);
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== data.label) {
      updateNodeData(id, { label: trimmed });
    } else {
      setDraftTitle(data.label || 'table_name');
    }
  };

  const updateColumns = (newCols: ERColumn[]) => {
    updateNodeData(id, { columns: newCols });
  };

  const addColumn = () => {
    const newCol: ERColumn = {
      id: `col-${Date.now()}`,
      name: `field_${columns.length + 1}`,
      type: 'string',
    };
    updateColumns([...columns, newCol]);
  };

  const removeColumn = (colId: string) => {
    updateColumns(columns.filter((c) => c.id !== colId));
  };

  const toggleConstraint = (colId: string) => {
    updateColumns(
      columns.map((c) => {
        if (c.id !== colId) return c;
        if (c.isPk) return { ...c, isPk: false, isFk: true };
        if (c.isFk) return { ...c, isFk: false, isUnique: true };
        if (c.isUnique) return { ...c, isUnique: false };
        return { ...c, isPk: true };
      })
    );
  };

  const updateColumnName = (colId: string, name: string) => {
    updateColumns(columns.map((c) => (c.id === colId ? { ...c, name } : c)));
  };

  const updateColumnType = (colId: string, type: string) => {
    updateColumns(columns.map((c) => (c.id === colId ? { ...c, type } : c)));
  };

  const Icon = tableType === 'table' ? Table : tableType === 'view' ? Layers : Binary;

  return (
    <div
      className={cn(
        'relative min-w-[230px] max-w-[320px] rounded-[10px] border bg-card/95 shadow-md backdrop-blur-md select-none transition-all duration-150',
        selected ? 'ring-2 ring-accent ring-offset-1 ring-offset-bg shadow-xl' : 'hover:border-line-hover'
      )}
      style={{ borderColor: selected ? color : `${color}60` }}
    >
      {/* ── Outer Handles ── */}
      <Handle type="target" id="top-target" position={Position.Top} className="!top-0" />
      <Handle type="source" id="top-source" position={Position.Top} className="!top-0 !opacity-0" />
      <Handle type="target" id="bottom-target" position={Position.Bottom} className="!bottom-0" />
      <Handle type="source" id="bottom-source" position={Position.Bottom} className="!bottom-0 !opacity-0" />

      {/* ── Table Header ── */}
      <div
        className="flex items-center justify-between border-b px-3 py-2 rounded-t-[9px]"
        style={{
          borderColor: `${color}40`,
          backgroundColor: `${color}18`,
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Icon className="size-4 shrink-0" style={{ color }} />
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitle();
                if (e.key === 'Escape') {
                  setDraftTitle(data.label || 'table_name');
                  setIsEditingTitle(false);
                }
                e.stopPropagation();
              }}
              className="w-full bg-transparent text-[13px] font-bold text-ink outline-none"
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditingTitle(true);
              }}
              className="truncate text-[13px] font-bold text-text cursor-pointer hover:underline"
              title="Double-click to rename"
            >
              {data.label || 'table_name'}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={addColumn}
          aria-label="Add column"
          className="flex size-5 items-center justify-center rounded hover:bg-surface-2 text-text-muted hover:text-text transition-colors cursor-pointer shrink-0 ml-1"
          title="Add Column"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* ── Columns Table Rows ── */}
      <div className="divide-y divide-line/40 py-0.5">
        {columns.map((col) => {
          const isPk = col.isPk;
          const isFk = col.isFk;
          const isUnique = col.isUnique;

          return (
            <div
              key={col.id}
              className="group relative flex items-center gap-2 px-3 py-1.5 text-[11.5px] hover:bg-surface-2/60 transition-colors"
            >
              {/* Row Left Handle */}
              <Handle
                type="target"
                id={`handle-left-${col.id}`}
                position={Position.Left}
                style={{ left: -4, width: 7, height: 7, backgroundColor: color }}
              />
              <Handle
                type="source"
                id={`handle-left-src-${col.id}`}
                position={Position.Left}
                style={{ left: -4, width: 7, height: 7, opacity: 0 }}
              />

              {/* Column Name */}
              <input
                value={col.name}
                onChange={(e) => updateColumnName(col.id, e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className={cn(
                  'w-24 shrink-0 bg-transparent font-mono font-medium outline-none truncate',
                  isPk ? 'text-amber-400 font-semibold' : isFk ? 'text-blue-400' : 'text-ink'
                )}
                placeholder="column"
              />

              {/* Column Type */}
              <input
                value={col.type}
                onChange={(e) => updateColumnType(col.id, e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-16 shrink-0 bg-transparent font-mono text-[10.5px] text-text-muted outline-none truncate"
                placeholder="type"
              />

              {/* Key / Constraint Pill */}
              <button
                type="button"
                onClick={() => toggleConstraint(col.id)}
                title="Click to toggle PK / FK / UNIQUE / None"
                className={cn(
                  'ml-auto flex items-center justify-center rounded px-1.5 py-0.2 text-[9px] font-mono font-bold tracking-tight cursor-pointer transition-colors shrink-0',
                  isPk
                    ? 'border border-purple-500/40 bg-purple-500/20 text-purple-300 font-extrabold'
                    : isFk
                      ? 'border border-blue-500/40 bg-blue-500/20 text-blue-300 font-extrabold'
                      : isUnique
                        ? 'border border-purple-500/40 bg-purple-500/20 text-purple-300 font-extrabold'
                        : 'text-text-muted/40 hover:text-text-muted opacity-0 group-hover:opacity-100 border border-transparent'
                )}
              >
                {isPk ? 'PK' : isFk ? 'FK' : isUnique ? 'UNIQUE' : '+'}
              </button>

              {/* Delete Column Button */}
              <button
                type="button"
                onClick={() => removeColumn(col.id)}
                className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger size-4 flex items-center justify-center rounded cursor-pointer transition-opacity"
                title="Delete Column"
              >
                <X className="size-3" />
              </button>

              {/* Row Right Handle */}
              <Handle
                type="source"
                id={`handle-right-${col.id}`}
                position={Position.Right}
                style={{ right: -4, width: 7, height: 7, backgroundColor: color }}
              />
              <Handle
                type="target"
                id={`handle-right-tgt-${col.id}`}
                position={Position.Right}
                style={{ right: -4, width: 7, height: 7, opacity: 0 }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ERTableNode = memo(ERTableComponent);
