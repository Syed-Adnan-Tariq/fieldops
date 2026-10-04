'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/ui/Header';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { MileageReport, JobCompletionReport } from '@fieldops/shared';
import { format, subDays } from 'date-fns';
import { BarChart3, PieChart as PieIcon, Table2, RefreshCw, Download } from 'lucide-react';

const PIE_COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6'];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://187.127.122.138:3001';

type TabType = 'overview' | 'mileage' | 'performance';

const tabs: { label: string; value: TabType; icon: React.ReactNode }[] = [
  { label: 'Overview',    value: 'overview',     icon: <PieIcon className="w-4 h-4" /> },
  { label: 'Mileage',     value: 'mileage',      icon: <BarChart3 className="w-4 h-4" /> },
  { label: 'Performance', value: 'performance',  icon: <Table2 className="w-4 h-4" /> },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [mileageData, setMileageData] = useState<MileageReport[]>([]);
  const [completionData, setCompletionData] = useState<JobCompletionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingCSV, setExportingCSV] = useState<string | null>(null);

  const { accessToken } = useAuthStore();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const [mileageRes, completionRes] = await Promise.all([
        api.get<MileageReport[]>('/reports/mileage', {
          params: { startDate, endDate },
        }),
        api.get<JobCompletionReport>('/reports/job-completion', {
          params: { startDate, endDate },
        }),
      ]);
      setMileageData(mileageRes.data);
      setCompletionData(completionRes.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const exportCSV = async (endpoint: string, filename: string) => {
    setExportingCSV(filename);
    try {
      const params = new URLSearchParams({ format: 'csv', startDate, endDate });
      const response = await fetch(
        `${API_URL}/api/v1/${endpoint}?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export failed:', err);
    } finally {
      setExportingCSV(null);
    }
  };

  const pieData = completionData
    ? [
        { name: 'Completed', value: completionData.completedJobs },
        { name: 'Failed', value: completionData.failedJobs },
        { name: 'Cancelled', value: completionData.cancelledJobs },
        {
          name: 'In Progress',
          value:
            completionData.totalJobs -
            completionData.completedJobs -
            completionData.failedJobs -
            completionData.cancelledJobs,
        },
      ].filter((d) => d.value > 0)
    : [];

  const mileageChartData = mileageData.map((d) => ({
    name: d.workerName.split(' ')[0],
    miles: Math.round(d.totalDistanceMiles * 10) / 10,
    km: Math.round(d.totalDistanceKm * 10) / 10,
  }));

  return (
    <div>
      <Header
        title="Reports"
        subtitle="Analytics and performance insights"
        actions={
          <button
            onClick={fetchReports}
            disabled={loading}
            className="btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Date range controls */}
        <div className="card p-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input w-auto"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input w-auto"
            />
          </div>
          <button
            onClick={fetchReports}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Applying...' : 'Apply'}
          </button>
        </div>

        {/* Summary stat cards */}
        {completionData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Jobs',     value: completionData.totalJobs,                          colorClass: 'text-blue-600',   borderClass: 'border-l-blue-500' },
              { label: 'Completed',      value: completionData.completedJobs,                      colorClass: 'text-green-600',  borderClass: 'border-l-green-500' },
              { label: 'Completion Rate',value: `${completionData.completionRate.toFixed(1)}%`,    colorClass: 'text-purple-600', borderClass: 'border-l-purple-500' },
              { label: 'Avg Duration',   value: `${Math.round(completionData.averageDurationMinutes)}m`, colorClass: 'text-orange-600', borderClass: 'border-l-orange-500' },
            ].map((stat) => (
              <div key={stat.label} className={`card p-4 border-l-4 ${stat.borderClass}`}>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.colorClass}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab navigation */}
        <div className="border-b border-slate-200 flex items-center gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px
                ${
                  activeTab === tab.value
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Job Status Distribution</h3>
              <button
                onClick={() => exportCSV('reports/job-completion', 'job-completion-report.csv')}
                disabled={exportingCSV !== null}
                className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {exportingCSV === 'job-completion-report.csv' ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                No data for selected period
              </div>
            )}
          </div>
        )}

        {activeTab === 'mileage' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Worker Mileage</h3>
              <button
                onClick={() => exportCSV('reports/mileage', 'mileage-report.csv')}
                disabled={exportingCSV !== null}
                className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {exportingCSV === 'mileage-report.csv' ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
            {mileageChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={mileageChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip formatter={(val) => [`${val} mi`, 'Miles']} />
                  <Bar dataKey="miles" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                No mileage data for selected period
              </div>
            )}
          </div>
        )}

        {activeTab === 'performance' && completionData && completionData.byWorker.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Worker Performance</h3>
              <button
                onClick={() => exportCSV('reports/job-completion', 'performance-report.csv')}
                disabled={exportingCSV !== null}
                className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {exportingCSV === 'performance-report.csv' ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-2.5">
                      Worker
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-4 py-2.5">
                      Assigned
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-4 py-2.5">
                      Completed
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-2.5">
                      Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {completionData.byWorker.map((w) => (
                    <tr key={w.workerId} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-900 font-medium">{w.workerName}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{w.assigned}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{w.completed}</td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`text-sm font-semibold ${
                            w.completionRate >= 80
                              ? 'text-green-600'
                              : w.completionRate >= 50
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {w.completionRate.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (!completionData || completionData.byWorker.length === 0) && (
          <div className="card p-12 text-center">
            <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No performance data for selected period</p>
          </div>
        )}
      </div>
    </div>
  );
}
