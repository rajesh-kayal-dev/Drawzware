'use client';

import { TechIcon } from '@/lib/icons/tech-icons';
import type { ReactNode } from 'react';

interface ComponentIdentityProps {
  name: string;
  icon?: string;
  color: string;
  className?: string;
  iconSize?: 'small' | 'large';
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
  trailing,
  fallback,
}: ComponentIdentityProps) {
  const large = iconSize === 'large';

  return (
    <span
      className={`flex min-w-0 flex-col items-center text-center ${large ? 'h-[88px] justify-start gap-1.5' : 'justify-center'} ${className}`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-xl bg-white ${large ? 'size-10' : 'mb-1 size-8'}`}
      >
        {icon ? (
          <TechIcon
            name={icon}
            className={large ? 'size-6' : 'size-5'}
            color={color}
            aria-hidden="true"
          />
        ) : fallback}
      </span>
      <span className={`flex w-full items-center justify-center gap-1 ${large ? 'min-h-8' : ''}`}>
        <span className={`min-w-0 font-medium leading-tight text-ink line-clamp-2 break-words ${large ? 'text-[13px]' : 'text-[11px]'}`}>
          {name}
        </span>
        {trailing}
      </span>
    </span>
  );
}
