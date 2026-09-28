'use client';

import { useState, useRef, useEffect } from 'react';
import { JobData } from '@/hooks/useJobs';
import { JOB_PRIORITY_COLORS } from '@fieldops/shared';
import { MoreHorizontal, UserCheck, Send, Eye, Zap, ChevronDown } from 'lucide-react';
import api from '@/lib/api';

interface JobCardProps {
  job: JobData;
  onStatusChange?: (jobId: string, status: string) => void;
  onRefresh?: () => void;
}

const statusColors: Record<string, string> = {
  pending:     'bg-slate-100 text-slate-600',
  assigned:    'bg-blue-100 text-blue-700',
  dispatched:  'bg-purple-100 text-purple-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  on_site:     'bg-orange-100 text-orange-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
  failed:      'bg-red-100 text-red-600',
};

export function JobCard({ job, onStatusChange, onRefresh }: JobCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [autoDispatching, setAutoDispatching] = useState(false);
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const customFields = (job as any).customFields as Array<{ key: string; value: string; type: string }> | undefined;
  const priorityColor = JOB_PRIORITY_COLORS[job.priority] || '#94a3b8';
  const statusStyle = statusColors[job.status] || 'bg-slate-100 text-slate-600';

  const handleAutoDispatch = async () => {
    setMenuOpen(false);
    setAutoDispatching(true);
    try {
      await api.post(`/jobs/${job.id}/auto-dispatch`);
      onRefresh?.();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Auto-dispatch failed';
      alert(msg);
    } finally {
      setAutoDispatching(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const hasCustomFields = Array.isArray(customFields) && customFields.length > 0;

  return (
    <div className="border-b border-slate-100 last:border-0">
    <div className="flex items-center gap-3 px-4 h-14 hover:bg-slate-50 transition-colors group">
      {/* Priority dot */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: priorityColor }}
        title={job.priority}
      />

      {/* Title + Address */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">
          {job.title}
        </p>
        <p className="text-xs text-slate-400 truncate max-w-[200px]">
          {job.addressStreet}, {job.addressCity}
        </p>
      </div>

      {/* Status */}
      <div className="flex-shrink-0 hidden sm:block">
        <span className={`badge ${statusStyle}`}>
          {job.status.replace('_', ' ')}
        </span>
      </div>

      {/* Worker */}
      <div className="flex-shrink-0 min-w-0 hidden md:block w-32">
        {job.assignedWorker ? (
          <span className="text-xs text-slate-600 truncate block">
            {job.assignedWorker.firstName} {job.assignedWorker.lastName}
          </span>
        ) : (
          <span className="text-xs text-slate-400">Unassigned</span>
        )}
      </div>

      {/* Scheduled */}
      <div className="flex-shrink-0 hidden lg:block w-32">
        {job.scheduledStartAt ? (
          <span className="text-xs text-slate-500">
            {new Date(job.scheduledStartAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </div>

      {/* Custom fields expand toggle */}
      {hasCustomFields && (
        <button
          onClick={() => setCustomFieldsOpen((v) => !v)}
          className="p-1.5 rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
          aria-label="Toggle custom fields"
          aria-expanded={customFieldsOpen}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${customFieldsOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Actions menu */}
      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="p-1.5 rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg border border-slate-200 shadow-lg z-20 py-1 text-sm">
            <button
              onClick={() => { onStatusChange?.(job.id, 'assigned'); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <UserCheck className="w-4 h-4 text-slate-400" />
              Assign
            </button>
            <button
              onClick={() => { onStatusChange?.(job.id, 'dispatched'); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Send className="w-4 h-4 text-slate-400" />
              Dispatch
            </button>
            <button
              onClick={handleAutoDispatch}
              disabled={autoDispatching}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-slate-400" />
              {autoDispatching ? 'Dispatching...' : 'Auto-Dispatch'}
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Eye className="w-4 h-4 text-slate-400" />
              View Details
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Custom fields expandable section */}
    {hasCustomFields && customFieldsOpen && (
      <div className="px-10 pb-3 bg-slate-50 border-t border-slate-100">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide pt-2 pb-1.5">Custom Fields</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {customFields!.map((field, i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 px-3 py-2">
              <p className="text-xs text-slate-400 truncate">{field.key || 'Unnamed'}</p>
              <p className="text-sm font-medium text-slate-700 truncate mt-0.5">
                {field.type === 'checkbox'
                  ? field.value === 'true' ? 'Yes' : 'No'
                  : field.value || '—'}
              </p>
              <span className="text-xs text-slate-300">{field.type}</span>
            </div>
          ))}
        </div>
      </div>
    )}
    </div>
  );
}
