'use client';

import Link from 'next/link';
import { JobData } from '@/hooks/useJobs';
import { JOB_PRIORITY_COLORS } from '@fieldops/shared';

interface RecentJobsProps {
  jobs: JobData[];
  loading?: boolean;
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

export function RecentJobs({ jobs, loading }: RecentJobsProps) {
  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="h-4 bg-slate-200 rounded w-28 animate-pulse" />
          <div className="h-3.5 bg-slate-100 rounded w-14 animate-pulse" />
        </div>
        <div className="divide-y divide-slate-50">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-slate-200 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
              <div className="h-5 bg-slate-100 rounded-full w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">Recent Jobs</h3>
        <Link
          href="/jobs"
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          View all
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-slate-400">No jobs yet</p>
          <Link
            href="/jobs/new"
            className="mt-2 inline-block text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Create first job
          </Link>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left text-xs font-medium text-slate-500 px-5 py-2.5">Title</th>
              <th className="text-left text-xs font-medium text-slate-500 px-3 py-2.5">Status</th>
              <th className="text-left text-xs font-medium text-slate-500 px-3 py-2.5 hidden sm:table-cell">Priority</th>
              <th className="text-left text-xs font-medium text-slate-500 px-3 py-2.5 hidden md:table-cell">Location</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const priorityColor = JOB_PRIORITY_COLORS[job.priority] || '#94a3b8';
              return (
                <tr
                  key={job.id}
                  className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-slate-900 truncate max-w-[180px]">
                      {job.title}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`badge ${statusColors[job.status] ?? 'bg-slate-100 text-slate-600'}`}
                    >
                      {job.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: priorityColor }}
                      />
                      <span className="text-xs text-slate-500 capitalize">{job.priority}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <span className="text-xs text-slate-500 truncate max-w-[140px] block">
                      {job.addressCity}, {job.addressState}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
