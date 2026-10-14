'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Globe,
  Server,
  Layers,
  Database,
  User,
  ShoppingBag,
  Bell,
  Cpu,
} from 'lucide-react';

interface ArchNode {
  id: string;
  title: string;
  tech: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  desktopPos: { top: string; left: string };
  mobilePos: { top: string; left: string };
  connectsTo: string[];
}

function ArchitecturePreview() {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const nodes: ArchNode[] = [
    {
      id: 'client',
      title: 'Client',
      tech: 'React',
      description: 'Web / Mobile / Desktop',
      icon: <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
      iconBg: 'bg-purple-100 border-purple-200',
      iconColor: 'text-purple-700',
      desktopPos: { top: '8%', left: '12%' },
      mobilePos: { top: '7%', left: '22%' },
      connectsTo: ['lb', 'gateway'],
    },
    {
      id: 'database',
      title: 'Database',
      tech: 'PostgreSQL',
      description: 'ACID Relational Storage',
      icon: <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
      iconBg: 'bg-teal-100 border-teal-200',
      iconColor: 'text-teal-700',
      desktopPos: { top: '8%', left: '56%' },
      mobilePos: { top: '7%', left: '76%' },
      connectsTo: ['users', 'gateway'],
    },
    {
      id: 'lb',
      title: 'Load Balancer',
      tech: 'Nginx',
      description: 'Layer 7 Ingress',
      icon: <Server className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
      iconBg: 'bg-emerald-100 border-emerald-200',
      iconColor: 'text-emerald-700',
      desktopPos: { top: '38%', left: '12%' },
      mobilePos: { top: '28%', left: '20%' },
      connectsTo: ['gateway'],
    },
    {
      id: 'users',
      title: 'User Service',
      tech: 'Node.js',
      description: 'User management',
      icon: <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
      iconBg: 'bg-sky-100 border-sky-200',
      iconColor: 'text-sky-700',
      desktopPos: { top: '26%', left: '76%' },
      mobilePos: { top: '28%', left: '78%' },
      connectsTo: ['gateway', 'database'],
    },
    {
      id: 'orders',
      title: 'Order Service',
      tech: 'Go',
      description: 'Order processing',
      icon: <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
      iconBg: 'bg-blue-100 border-blue-200',
      iconColor: 'text-blue-700',
      desktopPos: { top: '56%', left: '76%' },
      mobilePos: { top: '56%', left: '78%' },
      connectsTo: ['gateway', 'queue'],
    },
    {
      id: 'queue',
      title: 'Queue',
      tech: 'RabbitMQ',
      description: 'Event-driven',
      icon: <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
      iconBg: 'bg-pink-100 border-pink-200',
      iconColor: 'text-pink-600',
      desktopPos: { top: '76%', left: '16%' },
      mobilePos: { top: '74%', left: '22%' },
      connectsTo: ['orders', 'notification'],
    },
    {
      id: 'notification',
      title: 'Notification',
      tech: 'Python',
      description: 'Email / SMS',
      icon: <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
      iconBg: 'bg-purple-100 border-purple-200',
      iconColor: 'text-purple-700',
      desktopPos: { top: '82%', left: '68%' },
      mobilePos: { top: '86%', left: '74%' },
      connectsTo: ['queue'],
    },
  ];

  const desktopConnections = [
    { from: 'client', to: 'lb', d: 'M 24 16 C 24 28, 24 34, 24 40' },
    { from: 'lb', to: 'hub', d: 'M 30 46 C 36 46, 42 50, 48 50' },
    { from: 'hub', to: 'database', d: 'M 50 44 C 50 32, 54 24, 60 16' },
    { from: 'hub', to: 'users', d: 'M 52 48 C 60 44, 68 36, 74 32' },
    { from: 'hub', to: 'orders', d: 'M 52 52 C 60 54, 68 58, 74 62' },
    { from: 'hub', to: 'queue', d: 'M 48 54 C 40 62, 34 70, 30 78' },
    { from: 'queue', to: 'notification', d: 'M 32 82 C 44 86, 56 86, 68 86' },
  ];

  const mobileConnections = [
    { from: 'client', to: 'lb', d: 'M 28 14 C 28 20, 26 24, 26 30' },
    { from: 'lb', to: 'hub', d: 'M 32 34 C 40 40, 44 46, 48 48' },
    { from: 'hub', to: 'database', d: 'M 50 44 C 50 28, 62 20, 70 14' },
    { from: 'hub', to: 'users', d: 'M 52 48 C 62 42, 68 36, 72 34' },
    { from: 'hub', to: 'orders', d: 'M 52 52 C 62 54, 68 56, 72 58' },
    { from: 'hub', to: 'queue', d: 'M 48 52 C 40 60, 34 68, 30 74' },
    { from: 'queue', to: 'notification', d: 'M 32 80 C 44 84, 58 86, 68 88' },
  ];

  return (
    <div
      className="relative w-full min-h-[460px] sm:min-h-[500px] md:min-h-0 md:aspect-[4/3] max-w-[680px] mx-auto select-none overflow-hidden sm:overflow-visible"
      aria-label="Interactive architecture diagram showing microservices connected to central gateway"
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(167,243,208,0.6),rgba(209,250,229,0.2),transparent)] blur-2xl pointer-events-none" />

      {/* SVG Canvas for Desktop Curves */}
      <svg
        className="hidden md:block absolute inset-0 w-full h-full pointer-events-none z-0"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {desktopConnections.map((conn, index) => {
          const isHighlighted =
            activeNode &&
            (conn.from === activeNode || conn.to === activeNode || conn.from === 'hub');

          return (
            <g key={`d-${index}`}>
              <path
                d={conn.d}
                fill="none"
                stroke={isHighlighted ? '#6ee7b7' : '#a7f3d0'}
                strokeWidth={isHighlighted ? '1.2' : '0.8'}
                strokeDasharray="1.5 1.5"
                className="transition-all duration-300"
              />
              <circle r="0.6" fill="#047857">
                <animateMotion
                  path={conn.d}
                  dur={`${4 + (index % 3)}s`}
                  repeatCount="indefinite"
                  rotate="auto"
                />
              </circle>
            </g>
          );
        })}
      </svg>

      {/* SVG Canvas for Mobile Curves */}
      <svg
        className="block md:hidden absolute inset-0 w-full h-full pointer-events-none z-0"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {mobileConnections.map((conn, index) => {
          const isHighlighted =
            activeNode &&
            (conn.from === activeNode || conn.to === activeNode || conn.from === 'hub');

          return (
            <g key={`m-${index}`}>
              <path
                d={conn.d}
                fill="none"
                stroke={isHighlighted ? '#6ee7b7' : '#a7f3d0'}
                strokeWidth={isHighlighted ? '1.4' : '0.9'}
                strokeDasharray="2 2"
                className="transition-all duration-300"
              />
              <circle r="0.8" fill="#047857">
                <animateMotion
                  path={conn.d}
                  dur={`${4 + (index % 3)}s`}
                  repeatCount="indefinite"
                  rotate="auto"
                />
              </circle>
            </g>
          );
        })}
      </svg>

      {/* Central Emerald Hub (Gateway Core) */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center cursor-pointer group touch-manipulation"
        onClick={() => setActiveNode(activeNode === 'hub' ? null : 'hub')}
        onMouseEnter={() => setActiveNode('hub')}
        onMouseLeave={() => setActiveNode(null)}
      >
        <div className="absolute w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-3xl bg-emerald-300/25 blur-lg lp-pulse-glow" />
        <div className="absolute w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl bg-emerald-400/30 rotate-12 transition-transform duration-500 group-hover:rotate-45" />

        <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-700 p-0.5 shadow-lg shadow-emerald-700/20 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <div className="w-full h-full rounded-[10px] bg-gradient-to-b from-emerald-500/90 to-teal-800/90 flex flex-col items-center justify-center text-white">
            <Cpu className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-emerald-100" />
            <span className="text-[8px] sm:text-[9px] font-semibold tracking-wider uppercase text-emerald-200 mt-0.5">
              Gateway
            </span>
          </div>
        </div>

        {activeNode === 'hub' && (
          <div className="absolute -bottom-8 bg-[#0b291d] text-white text-[10px] sm:text-[11px] font-medium py-1 px-2.5 rounded-md shadow-md whitespace-nowrap z-30 pointer-events-none">
            API Gateway &amp; Mesh Router
          </div>
        )}
      </div>

      {/* Node Cards */}
      {nodes.map((node) => {
        const isActive = activeNode === node.id;
        return (
          <div
            key={node.id}
            onClick={() => setActiveNode(isActive ? null : node.id)}
            onMouseEnter={() => setActiveNode(node.id)}
            onMouseLeave={() => setActiveNode(null)}
            className={`absolute z-20 transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer touch-manipulation ${
              isActive ? 'scale-105 z-30' : 'hover:scale-105'
            }`}
            style={{
              top: `var(--lp-top-${node.id})`,
              left: `var(--lp-left-${node.id})`,
            }}
          >
            <style>{`
              :root {
                --lp-top-${node.id}: ${node.mobilePos.top};
                --lp-left-${node.id}: ${node.mobilePos.left};
              }
              @media (min-width: 768px) {
                :root {
                  --lp-top-${node.id}: ${node.desktopPos.top};
                  --lp-left-${node.id}: ${node.desktopPos.left};
                }
              }
            `}</style>

            <div
              className={`flex items-center gap-1.5 sm:gap-2 md:gap-2.5 px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-3 md:py-2 bg-white/95 backdrop-blur-sm rounded-xl border transition-all duration-200 ${
                isActive
                  ? 'border-emerald-500 shadow-lg shadow-emerald-900/10 ring-2 ring-emerald-500/20'
                  : 'border-neutral-200/90 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.06)] hover:border-emerald-300'
              }`}
            >
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 border ${node.iconBg} ${node.iconColor}`}
              >
                {node.icon}
              </div>
              <div className="text-left leading-tight pr-0.5">
                <div className="text-[11px] sm:text-xs font-semibold text-neutral-900 whitespace-nowrap">
                  {node.title}
                </div>
                <div className="text-[9px] sm:text-[10px] text-neutral-500 font-medium whitespace-nowrap">
                  {node.tech}
                </div>
              </div>
            </div>

            {isActive && node.description && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-[#0b291d] text-white text-[9px] sm:text-[10px] font-medium py-0.5 px-2 rounded shadow-md whitespace-nowrap z-40 pointer-events-none max-w-[180px] truncate">
                {node.description}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface HeroSectionProps {
  onOpenDesktopApp: () => void;
}

export function LandingHeroSection({ onOpenDesktopApp }: HeroSectionProps) {
  return (
    <section className="relative w-full overflow-hidden pt-4 pb-12 sm:pt-8 sm:pb-16 lg:pt-14 lg:pb-24">
      {/* Mountain background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-bg.png"
          alt=""
          role="presentation"
          className="w-full h-full object-cover object-top opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#faf8f5]/40 via-transparent to-[#faf8f5]" />
      </div>

      {/* Floating crystals on xl */}
      <div className="hidden xl:block absolute -left-10 top-28 z-10 pointer-events-none w-36 h-36 opacity-85 lp-float-slow -rotate-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/emerald-crystal.jpg"
          alt=""
          role="presentation"
          className="w-full h-full object-contain drop-shadow-2xl"
        />
      </div>
      <div className="hidden xl:block absolute -right-8 top-36 z-10 pointer-events-none w-32 h-32 opacity-75 lp-float-reverse rotate-24">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/emerald-crystal.jpg"
          alt=""
          role="presentation"
          className="w-full h-full object-contain drop-shadow-2xl"
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left: Value Prop */}
          <div className="lg:col-span-5 text-left space-y-5 sm:space-y-6">
            <h1
              className="lp-font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-normal tracking-tight text-[#0b291d] leading-[1.15]"
              style={{ textWrap: 'balance' } as React.CSSProperties}
            >
              Design System <br className="hidden sm:inline" />
              Architecture,{' '}
              <span className="text-[#107548] font-medium italic">Visually.</span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-neutral-600 font-normal leading-relaxed max-w-xl">
              Create clear architecture diagrams, sequence flows, and database models in one focused workspace.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1 w-full">
              <Link
                href="/app"
                className="flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-semibold text-white bg-[#0b291d] hover:bg-[#071f16] active:scale-[0.98] rounded-xl shadow-md shadow-emerald-950/15 transition-all cursor-pointer w-full sm:w-auto"
              >
                <span>Start Diagramming</span>
                <svg className="w-4 h-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>

              <button
                onClick={onOpenDesktopApp}
                className="flex items-center justify-center gap-2.5 px-5 py-3.5 text-sm font-medium text-neutral-800 bg-white/90 hover:bg-white border border-neutral-300/80 active:scale-[0.98] rounded-xl shadow-sm hover:border-neutral-400 transition-all cursor-pointer w-full sm:w-auto"
              >
                <svg className="w-4 h-4 text-neutral-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
                <span>Desktop App — Coming Soon</span>
              </button>
            </div>

            {/* Metadata */}
            <div className="pt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-neutral-500">
              <span>Free to start</span>
              <span className="text-neutral-300" aria-hidden="true">·</span>
              <span>Built for developers</span>
              <span className="text-neutral-300" aria-hidden="true">·</span>
              <span>Your diagrams, your workflow</span>
            </div>
          </div>

          {/* Right: Hero Architecture Illustration */}
          <div className="lg:col-span-7 flex justify-center w-full overflow-hidden sm:overflow-visible">
            <ArchitecturePreview />
          </div>
        </div>
      </div>
    </section>
  );
}
