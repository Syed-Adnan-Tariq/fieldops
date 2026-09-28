'use client';

import Link from 'next/link';
import { Header } from '@/components/ui/Header';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentJobs } from '@/components/dashboard/RecentJobs';
import { useJobs } from '@/hooks/useJobs';
import { useWorkers } from '@/hooks/useWorkers';
import { JobStatus } from '@fieldops/shared';
import { Users, ClipboardList, CheckCircle, Clock, Plus, Map, UserPlus } from 'lucide-react';

export default function DashboardPage() {
  const { jobs, loading: jobsLoading } = useJobs({ limit: 50 });
  const { jobs: completedTodayJobs, loading: completedLoading } = useJobs({
    status: JobStatus.COMPLETED,
    limit: 200,
  });
  const { workers, loading: workersLoading } = useWorkers();

  const activeWorkers = workers.filter(
    (w) => w.status === 'available' || w.status === 'busy',
  ).length;

  const pendingJobs = jobs.filter(
    (j) => j.status === JobStatus.PENDING || j.status === JobStatus.ASSIGNED,
  ).length;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const completedJobs = completedTodayJobs.filter(
    (j) => new Date(j.updatedAt) >= todayStart,
  ).length;

  const inProgressJobs = jobs.filter(
    (j) =>
      j.status === JobStatus.IN_PROGRESS || j.status === JobStatus.ON_SITE,
  ).length;

  const statusDot = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'busy':      return 'bg-yellow-500';
      case 'on_break':  return 'bg-purple-500';
      default:          return 'bg-slate-400';
    }
  };

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Overview of your field operations"
        helpItems={[
          { icon: '📊', title: 'Stats cards', text: 'Live counts of active workers, jobs in progress, pending jobs, and completions today. These update automatically.' },
          { icon: '⚡', title: 'Quick actions', text: 'Use the three shortcut cards to jump directly to creating a job, viewing the live map, or managing workers.' },
          { icon: '📋', title: 'Recent jobs', text: 'Shows the latest jobs with their status. Click a job row to view details or use the ⋯ menu to assign or dispatch.' },
          { icon: '👷', title: 'Worker status', text: 'A live sidebar showing all workers and their current status (available, busy, on break, offline).' },
        ]}
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Active Workers"
            value={workersLoading ? '—' : activeWorkers}
            color="green"
            icon={<Users className="w-5 h-5" />}
          />
          <StatsCard
            title="Jobs in Progress"
            value={jobsLoading ? '—' : inProgressJobs}
            color="yellow"
            icon={<Clock className="w-5 h-5" />}
          />
          <StatsCard
            title="Pending Jobs"
            value={jobsLoading ? '—' : pendingJobs}
            color="blue"
            icon={<ClipboardList className="w-5 h-5" />}
          />
          <StatsCard
            title="Completed Today"
            value={completedLoading ? '—' : completedJobs}
            color="purple"
            icon={<CheckCircle className="w-5 h-5" />}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/jobs/new"
            className="card p-4 flex items-center gap-3 hover:shadow-md hover:border-slate-300 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
              <Plus className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">New Job</p>
              <p className="text-xs text-slate-500">Create a job</p>
            </div>
          </Link>
          <Link
            href="/map"
            className="card p-4 flex items-center gap-3 hover:shadow-md hover:border-slate-300 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 group-hover:bg-green-100 transition-colors">
              <Map className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">View Map</p>
              <p className="text-xs text-slate-500">Live tracking</p>
            </div>
          </Link>
          <Link
            href="/workers"
            className="card p-4 flex items-center gap-3 hover:shadow-md hover:border-slate-300 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-100 transition-colors">
              <UserPlus className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Workers</p>
              <p className="text-xs text-slate-500">Manage team</p>
            </div>
          </Link>
        </div>

        {/* Content — Recent Jobs (2/3) + Worker Status (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <RecentJobs jobs={jobs.slice(0, 8)} loading={jobsLoading} />
          </div>

          {/* Worker Status Sidebar */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Worker Status</h3>
              <span className="text-xs text-slate-400">{workers.length} total</span>
            </div>
            {workersLoading ? (
              <div className="divide-y divide-slate-50">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                    <div className="w-2 h-2 rounded-full bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : workers.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No workers found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {workers.slice(0, 8).map((worker) => (
                  <div key={worker.id} className="flex items-center gap-3 px-5 py-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                      {worker.firstName[0]}{worker.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">
                        {worker.firstName} {worker.lastName}
                      </p>
                      {worker.lastSeenAt && (
                        <p className="text-xs text-slate-400">
                          {new Date(worker.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full ${statusDot(worker.status)}`} />
                      <span className="text-xs text-slate-500 capitalize">
                        {worker.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
