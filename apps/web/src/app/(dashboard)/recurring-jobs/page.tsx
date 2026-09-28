'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/ui/Header';
import api from '@/lib/api';
import { Plus, RefreshCw, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react';

interface RecurringJob {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressPostalCode: string;
  addressCountry: string;
  frequency: string;
  intervalValue: number;
  startDate: string;
  endDate: string | null;
  estimatedDurationMinutes: number | null;
  nextRunAt: string | null;
  assignedWorkerId: string | null;
  isActive: boolean;
  createdAt: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const EMPTY_FORM = {
  title: '',
  description: '',
  priority: 'medium',
  addressStreet: '',
  addressCity: '',
  addressState: '',
  addressPostalCode: '',
  addressCountry: 'US',
  frequency: 'weekly',
  intervalValue: 1,
  startDate: '',
  endDate: '',
  estimatedDurationMinutes: '',
  assignedWorkerId: '',
};

export default function RecurringJobsPage() {
  const [jobs, setJobs] = useState<RecurringJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<RecurringJob[]>('/recurring-jobs');
      setJobs(res.data);
    } catch (err) {
      console.error('Failed to load recurring jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const openModal = () => {
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormError(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    if (!form.addressStreet.trim()) { setFormError('Street address is required.'); return; }
    if (!form.addressCity.trim()) { setFormError('City is required.'); return; }
    if (!form.addressState.trim()) { setFormError('State is required.'); return; }
    if (!form.addressPostalCode.trim()) { setFormError('Postal code is required.'); return; }
    if (!form.startDate) { setFormError('Start date is required.'); return; }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        addressStreet: form.addressStreet.trim(),
        addressCity: form.addressCity.trim(),
        addressState: form.addressState.trim(),
        addressPostalCode: form.addressPostalCode.trim(),
        addressCountry: form.addressCountry.trim() || 'US',
        frequency: form.frequency,
        intervalValue: form.intervalValue ? Number(form.intervalValue) : 1,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        estimatedDurationMinutes: form.estimatedDurationMinutes
          ? Number(form.estimatedDurationMinutes)
          : undefined,
        assignedWorkerId: form.assignedWorkerId.trim() || undefined,
      };

      await api.post('/recurring-jobs', payload);
      await fetchJobs();
      closeModal();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create recurring job.';
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await api.patch<RecurringJob>(`/recurring-jobs/${id}/toggle`);
      setJobs((prev) => prev.map((j) => (j.id === id ? res.data : j)));
    } catch (err) {
      console.error('Failed to toggle recurring job:', err);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete recurring job "${title}"? This will not remove already-created jobs.`)) return;
    try {
      await api.delete(`/recurring-jobs/${id}`);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch (err) {
      console.error('Failed to delete recurring job:', err);
    }
  };

  return (
    <div>
      <Header
        title="Recurring Jobs"
        subtitle={`${jobs.length} recurring job${jobs.length !== 1 ? 's' : ''}`}
        actions={
          <button onClick={openModal} className="btn-primary">
            <Plus className="w-4 h-4" />
            New Recurring Job
          </button>
        }
      />

      <div className="p-6">
        {loading ? (
          <div className="card overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
              {[120, 80, 100, 120, 80].map((w, i) => (
                <div key={i} className="h-3 bg-slate-200 rounded animate-pulse" style={{ width: w }} />
              ))}
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 h-14 border-b border-slate-50 animate-pulse">
                <div className="flex-1 h-3.5 bg-slate-200 rounded w-2/3" />
                <div className="h-5 bg-slate-100 rounded-full w-20" />
                <div className="h-3.5 bg-slate-100 rounded w-28 hidden md:block" />
                <div className="w-16 h-6 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="card p-12 text-center">
            <RefreshCw className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600 mb-1">No recurring jobs yet</p>
            <p className="text-xs text-slate-400 mb-4">
              Create a recurring job template and jobs will be automatically spawned on schedule.
            </p>
            <button onClick={openModal} className="btn-primary inline-flex">
              <Plus className="w-4 h-4" />
              Create your first recurring job
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wide">
              <div>Title / Address</div>
              <div className="hidden sm:block w-24 text-center">Frequency</div>
              <div className="hidden md:block w-36">Next Run</div>
              <div className="w-20 text-center">Active</div>
              <div className="w-8" />
            </div>

            {jobs.map((job) => (
              <div
                key={job.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group"
              >
                {/* Title + address */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold text-slate-900 truncate">{job.title}</span>
                    <span className={`badge text-xs flex-shrink-0 ${PRIORITY_COLORS[job.priority] ?? 'bg-slate-100 text-slate-600'}`}>
                      {job.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {job.addressStreet}, {job.addressCity}, {job.addressState} {job.addressPostalCode}
                  </p>
                </div>

                {/* Frequency */}
                <div className="hidden sm:flex w-24 justify-center">
                  <span className="badge bg-purple-100 text-purple-700 text-xs">
                    {FREQUENCY_LABELS[job.frequency] ?? job.frequency}
                  </span>
                </div>

                {/* Next run */}
                <div className="hidden md:block w-36">
                  <p className="text-xs text-slate-600">{formatDateTime(job.nextRunAt)}</p>
                </div>

                {/* Toggle */}
                <div className="w-20 flex justify-center">
                  <button
                    onClick={() => handleToggle(job.id)}
                    className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                      job.isActive ? 'text-green-600 hover:text-green-700' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title={job.isActive ? 'Click to deactivate' : 'Click to activate'}
                  >
                    {job.isActive ? (
                      <ToggleRight className="w-5 h-5" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                    <span className="hidden sm:inline">{job.isActive ? 'On' : 'Off'}</span>
                  </button>
                </div>

                {/* Delete */}
                <div className="w-8 flex justify-center">
                  <button
                    onClick={() => handleDelete(job.id, job.title)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Delete recurring job"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-slate-900">New Recurring Job</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Jobs will be created automatically on schedule
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable form body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    className="input w-full"
                    placeholder="e.g. Weekly Site Inspection"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    className="input w-full resize-none h-20"
                    placeholder="Optional job description..."
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Priority
                  </label>
                  <select name="priority" value={form.priority} onChange={handleChange} className="input w-full">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Address</p>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Street <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="addressStreet"
                      value={form.addressStreet}
                      onChange={handleChange}
                      className="input w-full"
                      placeholder="123 Main St"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="addressCity"
                        value={form.addressCity}
                        onChange={handleChange}
                        className="input w-full"
                        placeholder="Chicago"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="addressState"
                        value={form.addressState}
                        onChange={handleChange}
                        className="input w-full"
                        placeholder="IL"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Postal Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="addressPostalCode"
                        value={form.addressPostalCode}
                        onChange={handleChange}
                        className="input w-full"
                        placeholder="60601"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Country</label>
                      <input
                        name="addressCountry"
                        value={form.addressCountry}
                        onChange={handleChange}
                        className="input w-full"
                        placeholder="US"
                      />
                    </div>
                  </div>
                </div>

                {/* Recurrence */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recurrence</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Frequency <span className="text-red-500">*</span>
                      </label>
                      <select name="frequency" value={form.frequency} onChange={handleChange} className="input w-full">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Interval
                      </label>
                      <input
                        name="intervalValue"
                        type="number"
                        min={1}
                        value={form.intervalValue}
                        onChange={handleChange}
                        className="input w-full"
                        placeholder="1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="startDate"
                        type="date"
                        value={form.startDate}
                        onChange={handleChange}
                        className="input w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        End Date <span className="text-slate-400">(optional)</span>
                      </label>
                      <input
                        name="endDate"
                        type="date"
                        value={form.endDate}
                        onChange={handleChange}
                        className="input w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Estimated duration */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Estimated Duration (minutes) <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    name="estimatedDurationMinutes"
                    type="number"
                    min={1}
                    value={form.estimatedDurationMinutes}
                    onChange={handleChange}
                    className="input w-full"
                    placeholder="60"
                  />
                </div>

                {formError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {formError}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 pb-5 pt-3 flex items-center justify-end gap-2 border-t border-slate-100 flex-shrink-0">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
