'use client';

import { WorkerCard } from './WorkerCard';
import { WorkerData } from '@/hooks/useWorkers';
import { Users } from 'lucide-react';

interface WorkerListProps {
  workers: WorkerData[];
  loading?: boolean;
}

function WorkerCardSkeleton() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="h-4 bg-slate-200 rounded w-2/3" />
            <div className="h-5 bg-slate-100 rounded-full w-16" />
          </div>
          <div className="h-3 bg-slate-100 rounded w-3/4" />
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="h-3 bg-slate-100 rounded w-1/3" />
        <div className="h-3 bg-slate-100 rounded w-1/4" />
      </div>
    </div>
  );
}

export function WorkerList({ workers, loading }: WorkerListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <WorkerCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (workers.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600">No workers found</p>
        <p className="text-xs text-slate-400 mt-1">
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {workers.map((worker) => (
        <WorkerCard key={worker.id} worker={worker} />
      ))}
    </div>
  );
}
