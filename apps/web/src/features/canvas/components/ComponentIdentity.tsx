'use client';

import { TechIcon } from '@/lib/icons/tech-icons';
import type { ReactNode } from 'react';

interface ComponentIdentityProps {
  name: string;
  icon?: string;
  color: string;
  className?: string;
  iconSize?: 'small' | 'large';
  layout?: 'vertical' | 'horizontal';
  trailing?: ReactNode;
  fallback?: ReactNode;
}

/** Shared logo-over-name treatment for component library cards and canvas nodes. */
export function ComponentIdentity({
  name,
  icon,
  color,
  className = '',
  iconSize = 'small',
  layout = 'vertical',
  trailing,
  fallback,
}: ComponentIdentityProps) {
  const large = iconSize === 'large';
  const horizontal = layout === 'horizontal';

  return (
    <span
      className={`flex min-w-0 items-center ${horizontal ? 'flex-row gap-2.5 text-left' : 'flex-col gap-1.5 text-center'} ${className}`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-lg bg-white ${large && !horizontal ? 'size-9' : 'size-8'}`}
      >
        {icon ? (
          <TechIcon
            name={icon}
            className={large ? (horizontal ? 'size-6' : 'size-[30px]') : 'size-5'}
            color={color}
            aria-hidden="true"
          />
        ) : fallback}
      </span>
      <span className={`flex min-w-0 items-center gap-1 ${horizontal ? 'flex-1 justify-start' : 'w-full justify-center'}`}>
        <span className={`min-w-0 leading-tight text-ink line-clamp-2 break-words ${large ? 'text-[13px] font-semibold' : 'text-[11px] font-medium'}`}>
          {name}
        </span>
        {trailing}
      </span>
    </span>
  );
}
