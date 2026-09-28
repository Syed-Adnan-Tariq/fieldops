'use client';

import { WorkerData } from '@/hooks/useWorkers';
import { WORKER_STATUS_COLORS } from '@fieldops/shared';
import { Phone, Truck } from 'lucide-react';

interface WorkerCardProps {
  worker: WorkerData;
}

const statusBadgeColors: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  busy:      'bg-yellow-100 text-yellow-700',
  offline:   'bg-slate-100 text-slate-500',
  on_break:  'bg-purple-100 text-purple-700',
};

const avatarGradients: Record<string, string> = {
  available: 'from-green-400 to-emerald-600',
  busy:      'from-yellow-400 to-orange-500',
  offline:   'from-slate-400 to-slate-500',
  on_break:  'from-purple-400 to-purple-600',
};

export function WorkerCard({ worker }: WorkerCardProps) {
  const statusColor = WORKER_STATUS_COLORS[worker.status] || '#94a3b8';
  const badgeClass = statusBadgeColors[worker.status] ?? 'bg-slate-100 text-slate-500';
  const gradientClass = avatarGradients[worker.status] ?? 'from-slate-400 to-slate-500';

  return (
    <div className="card p-4 hover:shadow-md hover:border-slate-300 transition-all">
      {/* Top row: avatar + name + status */}
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
        >
          {worker.firstName[0]}{worker.lastName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 truncate">
              {worker.firstName} {worker.lastName}
            </h3>
            <span className={`badge flex-shrink-0 ${badgeClass}`}>
              {worker.status?.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{worker.email}</p>
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {worker.phone && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Phone className="w-3.5 h-3.5" />
              <span className="truncate max-w-[80px]">{worker.phone}</span>
            </div>
          )}
          {worker.vehicleId && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Truck className="w-3.5 h-3.5" />
              <span className="truncate max-w-[80px]">{worker.vehicleId}</span>
            </div>
          )}
        </div>
        {worker.lastSeenAt && (
          <p className="text-xs text-slate-300 flex-shrink-0">
            {new Date(worker.lastSeenAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </div>
  );
}
