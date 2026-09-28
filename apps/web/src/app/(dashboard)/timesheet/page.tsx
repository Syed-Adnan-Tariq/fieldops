'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/ui/Header';
import api from '@/lib/api';
import { format, subDays } from 'date-fns';
import { Clock, RefreshCw, Users, Timer, ChevronDown } from 'lucide-react';

interface WorkerSummary {
  workerId: string;
  workerName: string;
  totalMinutes: number;
  shiftCount: number;
}

interface WorkShift {
  id: string;
  workerId: string;
  worker: { firstName: string; lastName: string; email: string } | null;
  clockInAt: string;
  clockOutAt: string | null;
  durationMinutes: number | null;
  clockInLatitude: number | null;
  clockInLongitude: number | null;
  clockOutLatitude: number | null;
  clockOutLongitude: number | null;
  notes: string | null;
}

type TabType = 'summary' | 'shifts';

function formatDuration(minutes: number | null): string {
  if (minutes === null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatHours(minutes: number): string {
  const h = (minutes / 60).toFixed(1);
  return `${h}h`;
}

function formatDateTime(iso: string): string {
  return format(new Date(iso), 'MMM d, yyyy HH:mm');
}

export default function TimesheetPage() {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [from, setFrom] = useState(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summary, setSummary] = useState<WorkerSummary[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [shiftsTotal, setShiftsTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, shiftsRes] = await Promise.all([
        api.get('/timeclock/summary', { params: { from, to } }),
        api.get('/timeclock/shifts', { params: { from, to, page, limit } }),
      ]);
      setSummary(summaryRes.data);
      setShifts(shiftsRes.data.shifts);
      setShiftsTotal(shiftsRes.data.total);
    } catch (err) {
      console.error('Failed to fetch timesheet data:', err);
    } finally {
      setLoading(false);
    }
  }, [from, to, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalWorkers = summary.length;
  const totalHours = summary.reduce((acc, r) => acc + r.totalMinutes, 0);
  const totalShifts = summary.reduce((acc, r) => acc + r.shiftCount, 0);
  const openShifts = shifts.filter((s) => !s.clockOutAt).length;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header title="Timesheet" />

      <main className="flex-1 p-6 space-y-6">
        {/* Date range + refresh */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">From</label>
            <input
              type="date"
              className="input text-sm"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">To</label>
            <input
              type="date"
              className="input text-sm"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
            />
          </div>
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="w-5 h-5 text-blue-500" />}
            label="Workers"
            value={String(totalWorkers)}
            bg="bg-blue-50"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-emerald-500" />}
            label="Total Hours"
            value={formatHours(totalHours)}
            bg="bg-emerald-50"
          />
          <StatCard
            icon={<Timer className="w-5 h-5 text-violet-500" />}
            label="Total Shifts"
            value={String(totalShifts)}
            bg="bg-violet-50"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-amber-500" />}
            label="Open Shifts"
            value={String(openShifts)}
            bg="bg-amber-50"
          />
        </div>

        {/* Tabs */}
        <div className="card p-0 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <TabBtn label="Summary" active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
            <TabBtn label="All Shifts" active={activeTab === 'shifts'} onClick={() => setActiveTab('shifts')} />
          </div>

          {activeTab === 'summary' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Worker</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Shifts</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Hours</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg / Shift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-gray-400">Loading...</td>
                    </tr>
                  ) : summary.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-gray-400">No data for this period</td>
                    </tr>
                  ) : (
                    summary.map((row) => (
                      <tr key={row.workerId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{row.workerName || '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{row.shiftCount}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatHours(row.totalMinutes)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {row.shiftCount > 0
                            ? formatDuration(Math.round(row.totalMinutes / row.shiftCount))
                            : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {summary.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                      <td className="px-4 py-3 text-gray-900">Total</td>
                      <td className="px-4 py-3 text-right text-gray-900">{totalShifts}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{formatHours(totalHours)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {totalShifts > 0 ? formatDuration(Math.round(totalHours / totalShifts)) : '—'}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {activeTab === 'shifts' && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Worker</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Clock In</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Clock Out</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-400">Loading...</td>
                      </tr>
                    ) : shifts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-400">No shifts for this period</td>
                      </tr>
                    ) : (
                      shifts.map((shift) => (
                        <tr key={shift.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {shift.worker
                              ? `${shift.worker.firstName} ${shift.worker.lastName}`
                              : shift.workerId.slice(0, 8) + '...'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{formatDateTime(shift.clockInAt)}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {shift.clockOutAt ? formatDateTime(shift.clockOutAt) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 font-medium">
                            {formatDuration(shift.durationMinutes)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {shift.clockOutAt ? (
                              <span className="badge badge-success">Completed</span>
                            ) : (
                              <span className="badge badge-warning">Active</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {shiftsTotal > limit && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * limit + 1}–{Math.min(page * limit, shiftsTotal)} of {shiftsTotal}
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary text-xs px-3 py-1.5"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </button>
                    <button
                      className="btn-secondary text-xs px-3 py-1.5"
                      disabled={page * limit >= shiftsTotal}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 ${bg}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function TabBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  );
}
