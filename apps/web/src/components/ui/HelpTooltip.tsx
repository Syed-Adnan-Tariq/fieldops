'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

export interface HelpItem {
  title: string;
  text: string;
  icon?: string;
}

interface HelpTooltipProps {
  panelTitle: string;
  items: HelpItem[];
}

export function HelpTooltip({ panelTitle, items }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
          open
            ? 'bg-blue-100 text-blue-600'
            : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
        }`}
        aria-label="Page help"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-white/80" />
              <span className="text-sm font-semibold text-white">{panelTitle}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors"
              aria-label="Close help"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          {/* Items */}
          <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors"
              >
                {item.icon && (
                  <span className="text-base mt-0.5 flex-shrink-0">{item.icon}</span>
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-800 mb-0.5">{item.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
