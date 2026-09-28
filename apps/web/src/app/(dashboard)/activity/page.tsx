'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/ui/Header';
import api from '@/lib/api';
import { format, subDays, formatDistanceToNow } from 'date-fns';
import {
  Activity,
  Briefcase,
  UserCheck,
  CheckCircle2,
  LogIn,
  LogOut,
  RefreshCw,
  ChevronDown,
  User,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type EventType =
  | 'job_created'
  | 'job_status_changed'
  | 'job_assigned'
  | 'job_completed'
  | 'checkin'
  | 'checkout';

interface ActivityEvent {
  id: string;
  type: EventType;
  description: string;
  workerName: string | null;
  workerId: string | null;
  jobTitle: string | null;
  jobId: string | null;
  timestamp: string;
  meta: Record<string, unknown>;
}

interface ActivityResponse {
  events: ActivityEvent[];
  total: number;
}

interface Worker {
  id: string;
  firstName: string;
  lastName: string;
}

// ─── Config ─────────────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<
  EventType,
  { label: string; icon: React.ReactNode; iconBg: string; iconColor: string }
> = {
  job_created: {
    label: 'Job Created',
    icon: <Briefcase className="w-4 h-4" />,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  job_status_changed: {
    label: 'Status Changed',
    icon: <Activity className="w-4 h-4" />,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
  },
  job_assigned: {
    label: 'Job Assigned',
    icon: <UserCheck className="w-4 h-4" />,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
  job_completed: {
    label: 'Job Completed',
    icon: <CheckCircle2 className="w-4 h-4" />,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  checkin: {
    label: 'Checked In',
    icon: <LogIn className="w-4 h-4" />,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
  checkout: {
    label: 'Checked Out',
    icon: <LogOut className="w-4 h-4" />,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-500',
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const LIMIT = 50;

  // Load workers for filter dropdown
  useEffect(() => {
    api
      .get<Worker[]>('/users/workers')
      .then((res) => setWorkers(res.data))
      .catch(() => {});
  }, []);

  const fetchActivity = useCallback(
    async (pageNum = 1, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const params: Record<string, string> = {
          from: new Date(dateFrom).toISOString(),
          to: new Date(dateTo + 'T23:59:59').toISOString(),
          page: String(pageNum),
          limit: String(LIMIT),
        };
        if (selectedWorker) params.workerId = selectedWorker;

        const res = await api.get<ActivityResponse>('/activity', { params });
        const { events: newEvents, total: newTotal } = res.data;

        setTotal(newTotal);
        if (append) {
          setEvents((prev) => [...prev, ...newEvents]);
        } else {
          setEvents(newEvents);
        }
      } catch (err) {
        console.error('Failed to load activity:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [dateFrom, dateTo, selectedWorker],
  );

  // Initial fetch + re-fetch when filters change
  useEffect(() => {
    setPage(1);
    fetchActivity(1, false);
  }, [fetchActivity]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    autoRefreshRef.current = setInterval(() => {
      setPage(1);
      fetchActivity(1, false);
    }, 30_000);
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [fetchActivity]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchActivity(nextPage, true);
  };

  const hasMore = events.length < total;

  return (
    <div>
      <Header
        title="Activity Log"
        subtitle="Real-time feed of field operations events"
        actions={
          <button
            onClick={() => { setPage(1); fetchActivity(1, false); }}
            disabled={loading}
            className="btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        }
      />

      <div className="p-6 space-y-5">
        {/* Filters */}
        <div className="card p-4 flex flex-wrap items-center gap-4">
          {/* Worker filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">
              Worker
            </label>
            <div className="relative">
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="input pr-8 appearance-none w-44"
              >
                <option value="">All Workers</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.firstName} {w.lastName}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          {/* Date from */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input w-auto"
            />
          </div>

          {/* Date to */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input w-auto"
            />
          </div>

          {/* Total count */}
          {!loading && (
            <span className="ml-auto text-xs text-slate-400">
              {total} event{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Timeline */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="w-6 h-6 text-slate-300 animate-spin" />
              <p className="text-sm text-slate-400">Loading activity...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Activity className="w-10 h-10 text-slate-200" />
              <p className="text-sm text-slate-400">No activity in the selected period</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {events.map((event, idx) => {
                const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.job_status_changed;
                const ts = new Date(event.timestamp);
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
                  >
                    {/* Timeline line + icon */}
                    <div className="relative flex flex-col items-center flex-shrink-0 pt-0.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.iconBg} ${cfg.iconColor}`}
                      >
                        {cfg.icon}
                      </div>
                      {idx < events.length - 1 && (
                        <div className="w-px flex-1 bg-slate-100 mt-2 min-h-[1rem]" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="space-y-0.5">
                          <p className="text-sm text-slate-800 leading-snug">
                            {event.description}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {event.workerName && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                                <User className="w-3 h-3" />
                                {event.workerName}
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center text-xs font-medium rounded-full px-2 py-0.5 ${cfg.iconBg} ${cfg.iconColor}`}
                            >
                              {cfg.label}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-slate-400 whitespace-nowrap">
                            {formatDistanceToNow(ts, { addSuffix: true })}
                          </p>
                          <p className="text-xs text-slate-300 mt-0.5 whitespace-nowrap">
                            {format(ts, 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load more */}
          {!loading && hasMore && (
            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Showing {events.length} of {total} events
              </p>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                {loadingMore ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load more'
                )}
              </button>
            </div>
          )}

          {!loading && !hasMore && events.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-300">All {total} events loaded</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
