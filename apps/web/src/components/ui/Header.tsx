'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { HelpTooltip, HelpItem } from './HelpTooltip';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  helpItems?: HelpItem[];
}

export function Header({ title, subtitle, actions, helpItems }: HeaderProps) {
  // Fix hydration: only render date on client to avoid server/client locale mismatch
  const [dateStr, setDateStr] = useState('');
  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
    );
  }, []);

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions && <div className="flex items-center gap-2">{actions}</div>}

        {helpItems && helpItems.length > 0 && (
          <HelpTooltip panelTitle={`${title} — How it works`} items={helpItems} />
        )}

        <button
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        {dateStr && (
          <div className="px-2.5 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-500">
            {dateStr}
          </div>
        )}
      </div>
    </div>
  );
}
