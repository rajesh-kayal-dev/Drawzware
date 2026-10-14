/**
 * Drawzware branded logo component used in the landing page.
 * Uses Next.js Image for optimized loading.
 */


interface DrawzwareLogoProps {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DrawzwareLogo({ variant = 'dark', size = 'md', className = '' }: DrawzwareLogoProps) {
  const sizeMap = {
    sm: { h: 28, class: 'h-7' },
    md: { h: 36, class: 'h-9' },
    lg: { h: 48, class: 'h-12' },
  };

  const logoSrc = variant === 'light' ? '/drawzware-logo-white.png' : '/drawzware-logo.png';
  const { h } = sizeMap[size];

  return (
    <div className={`inline-flex items-center select-none shrink-0 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt="Drawzware"
        style={{ height: `${h}px`, width: 'auto', maxHeight: `${h}px` }}
        className="object-contain transition-opacity duration-200 hover:opacity-90 shrink-0"
        loading="eager"
        decoding="async"
      />
    </div>
  );
}
