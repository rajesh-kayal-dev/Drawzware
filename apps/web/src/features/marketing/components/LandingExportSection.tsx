'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Github, ExternalLink, Copy, Check, Download } from 'lucide-react';

const mermaidCode = `graph TD
  Client[React App] -->|HTTPS| Nginx[Nginx Load Balancer]
  Nginx --> Gateway[Kong API Gateway]
  Gateway -->|Auth| UserSvc[Node.js User Service]
  Gateway -->|Checkout| OrderSvc[Go Order Service]
  UserSvc --> Postgres[(PostgreSQL DB)]
  OrderSvc --> RabbitMQ{RabbitMQ Queue}
  RabbitMQ --> Notifier[Python Notifier]`;

const jsonSnippet = `{
  "system": "Drawzware Modern Microservices",
  "version": "1.0",
  "services": [
    { "id": "client", "type": "frontend", "runtime": "React 19" },
    { "id": "gateway", "type": "ingress", "runtime": "Kong" },
    { "id": "orders", "type": "backend", "runtime": "Go 1.24" },
    { "id": "queue", "type": "broker", "runtime": "RabbitMQ" }
  ]
}`;

const svgSnippet = `<svg width="800" height="400" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#faf8f5" />
  <g id="drawzware-architecture" stroke="#059669" stroke-width="2">
    <!-- Component Architecture Nodes and Connectors -->
  </g>
</svg>`;

type ExportFormat = 'mermaid' | 'json' | 'svg';

export function LandingExportSection() {
  const [activeFormat, setActiveFormat] = useState<ExportFormat>('mermaid');
  const [copied, setCopied] = useState(false);

  const getActiveCode = () => {
    if (activeFormat === 'mermaid') return mermaidCode;
    if (activeFormat === 'json') return jsonSnippet;
    return svgSnippet;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = activeFormat === 'mermaid' ? 'mmd' : activeFormat === 'json' ? 'json' : 'svg';
    const mime =
      activeFormat === 'mermaid'
        ? 'text/plain'
        : activeFormat === 'json'
        ? 'application/json'
        : 'image/svg+xml';
    const blob = new Blob([getActiveCode()], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `architecture-export.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lines = getActiveCode().split('\n');

  return (
    <section className="w-full py-14 sm:py-20 lg:py-28 bg-[#faf8f5] border-t border-neutral-200/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left: Text */}
          <div className="lg:col-span-5 space-y-5 sm:space-y-6">
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-neutral-400">
                For developers
              </span>
              <h2 className="lp-font-serif text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-normal tracking-tight text-[#0b291d] mt-2 leading-[1.18]">
                Share your architecture anywhere
              </h2>
            </div>

            <p className="text-sm sm:text-base text-neutral-600 font-normal leading-relaxed">
              Export diagrams for documentation, reviews, and technical discussions.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 w-full sm:w-auto">
              <Link
                href="/app"
                className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#0b291d] hover:bg-[#071f16] active:scale-[0.98] rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap w-full sm:w-auto"
              >
                <span>Explore features</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </Link>

              <a
                href="https://github.com/rajesh-kayal-dev/Drawzware"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-neutral-800 bg-white hover:bg-neutral-50 border border-neutral-300/80 active:scale-[0.98] rounded-xl shadow-sm transition-all whitespace-nowrap w-full sm:w-auto"
              >
                <Github className="w-4 h-4 text-neutral-700" />
                <span>View on GitHub</span>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
              </a>
            </div>
          </div>

          {/* Right: Code Preview */}
          <div className="lg:col-span-7 w-full overflow-hidden">
            <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden">
              {/* Window Header */}
              <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-[#f7f6f2] border-b border-neutral-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ef4444] inline-block" />
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#eab308] inline-block" />
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#22c55e] inline-block" />
                  </div>
                  <span className="text-[11px] sm:text-xs text-neutral-500 font-medium ml-1.5 truncate">
                    Diagram export preview
                  </span>
                </div>

                {/* Format Tabs */}
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-neutral-200 shrink-0">
                  {(['mermaid', 'json', 'svg'] as ExportFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setActiveFormat(fmt)}
                      className={`px-2 py-1 text-[10px] sm:text-[11px] font-medium rounded transition-colors ${
                        activeFormat === fmt
                          ? 'bg-emerald-50 text-emerald-900 font-semibold'
                          : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      {fmt.charAt(0).toUpperCase() + fmt.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Body */}
              <div className="p-3 sm:p-5 font-mono text-[11px] sm:text-xs leading-relaxed overflow-x-auto bg-[#faf8f5] max-h-[320px]">
                <table className="w-full border-collapse">
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-emerald-50/40">
                        <td className="w-7 sm:w-8 pr-3 sm:pr-4 text-right text-neutral-300 select-none tabular-nums font-mono">
                          {idx + 1}
                        </td>
                        <td className="text-neutral-800 whitespace-pre font-mono">
                          {line.includes('graph') || line.includes('{') || line.includes('}') ? (
                            <span className="text-emerald-700 font-medium">{line}</span>
                          ) : line.includes('-->') ? (
                            <span>
                              <span className="text-neutral-900 font-semibold">
                                {line.split('-->')[0]}
                              </span>
                              <span className="text-emerald-600">--&gt;</span>
                              <span className="text-sky-700 font-medium">
                                {line.split('-->')[1]}
                              </span>
                            </span>
                          ) : line.includes(':') ? (
                            <span>
                              <span className="text-emerald-800 font-semibold">
                                {line.split(':')[0]}:
                              </span>
                              <span className="text-neutral-700">{line.split(':').slice(1).join(':')}</span>
                            </span>
                          ) : (
                            <span>{line}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Bar */}
              <div className="px-4 sm:px-5 py-3 bg-white border-t border-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-[11px] sm:text-xs text-neutral-400">
                  Ready to paste into GitHub PRs, Markdown docs, or wikis
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={handleCopy}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
