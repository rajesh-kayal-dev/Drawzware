'use client';

import { NODE_REGISTRY } from '@/features/canvas/nodes/node-registry';
import { Button } from '@/shared/components/ui/button';
import { Kbd } from '@/shared/components/ui/kbd';
import { Panel } from '@/shared/components/ui/panel';
import type { SystemNodeType } from '@/features/canvas/types/canvas.types';
import { useAddNodeAtCenter } from '../utils/canvas-helpers';

const QUICK_ADD: SystemNodeType[] = ['client', 'cdn', 'load-balancer', 'api-gateway', 'service', 'database', 'cache'];

/** Centered starter card for a canvas with no nodes. `offsetLeft` keeps it centered beside the library. */
export function EmptyCanvas({ offsetLeft = 0 }: { offsetLeft?: number }) {
  const addAtCenter = useAddNodeAtCenter();

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center p-4"
      style={{ paddingLeft: offsetLeft + 16 }}
    >
      <Panel className="animate-panel-in pointer-events-auto w-[360px] max-w-full p-[18px] text-center">
        <h2 className="text-[15px] font-semibold tracking-[-0.015em]">Start with a component</h2>
        <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
          {QUICK_ADD.map((type) => {
            const config = NODE_REGISTRY[type];
            const Icon = config.icon;
            return (
              <Button key={type} variant="secondary" size="sm" onClick={() => addAtCenter(type)}>
                <Icon style={{ color: config.color }} />
                {config.label}
              </Button>
            );
          })}
        </div>
        <p className="mt-3.5 inline-flex items-center gap-1 text-[12px] text-ink-3">
          or press
          <span className="inline-flex gap-[3px]">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </p>
        <p className="mt-0.5 text-[12px] text-ink-3">Drag from the library</p>
      </Panel>
    </div>
  );
}
