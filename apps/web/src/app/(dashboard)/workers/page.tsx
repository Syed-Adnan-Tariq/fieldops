'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/ui/Header';
import { WorkerList } from '@/components/workers/WorkerList';
import { useWorkers } from '@/hooks/useWorkers';
import { useSocket } from '@/hooks/useSocket';
import { SOCKET_EVENTS, LiveLocationUpdate } from '@fieldops/shared';
import { Search, UserPlus, X } from 'lucide-react';
import api from '@/lib/api';

export default function WorkersPage() {
  const { workers, loading, error, updateWorkerLocation, fetchWorkers } = useWorkers();
  const { on } = useSocket();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    transportMode: 'vehicle', vehicleId: '', password: 'Worker1234!',
  });

  useEffect(() => {
    const remove = on(SOCKET_EVENTS.LOCATION_BROADCAST, (data: unknown) => {
      const update = data as LiveLocationUpdate;
      updateWorkerLocation(update.workerId, update.latitude, update.longitude, update.status);
    });
    return remove;
  }, [on, updateWorkerLocation]);

  const filteredWorkers = workers.filter(
    (w) =>
      !searchQuery ||
      `${w.firstName} ${w.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const byStatus = {
    available: workers.filter((w) => w.status === 'available').length,
    busy: workers.filter((w) => w.status === 'busy').length,
    offline: workers.filter((w) => w.status === 'offline').length,
    on_break: workers.filter((w) => w.status === 'on_break').length,
  };

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post('/auth/register', { ...form, role: 'worker' });
      setShowModal(false);
      setForm({ firstName: '', lastName: '', email: '', phone: '', transportMode: 'vehicle', vehicleId: '', password: 'Worker1234!' });
      fetchWorkers();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e?.response?.data?.message;
      setFormError(Array.isArray(msg) ? msg[0] : msg ?? 'Failed to create worker');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Header
        title="Workers"
        subtitle={`${workers.length} total worker${workers.length !== 1 ? 's' : ''}`}
        helpItems={[
          { icon: '➕', title: 'Adding a worker', text: 'Click "Add Worker" and fill in the worker\'s name, email, and a password. The worker uses these credentials to log into the mobile app.' },
          { icon: '📱', title: 'Mobile app login', text: 'Give the worker their email and password. They open the FieldOps mobile app, tap Log In, and enter those details to get started.' },
          { icon: '🚗', title: 'Transport mode', text: 'Choose how the worker travels — Vehicle, Bicycle, or On Foot. This is used for route optimization and reporting.' },
          { icon: '🟢', title: 'Status colours', text: 'Green = Available, Yellow = Busy (has active job), Purple = On Break, Grey = Offline (app closed or no internet).' },
          { icon: '📡', title: 'Live location', text: 'Worker locations update in real-time on the Live Map page as long as the mobile app is open and GPS is enabled.' },
        ]}
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <UserPlus className="w-4 h-4" />
            Add Worker
          </button>
        }
      />

      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge bg-green-100 text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 inline-block" />
              {byStatus.available} Available
            </span>
            <span className="badge bg-yellow-100 text-yellow-700">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1.5 inline-block" />
              {byStatus.busy} Busy
            </span>
            <span className="badge bg-slate-100 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5 inline-block" />
              {byStatus.offline} Offline
            </span>
            {byStatus.on_break > 0 && (
              <span className="badge bg-purple-100 text-purple-700">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5 inline-block" />
                {byStatus.on_break} On Break
              </span>
            )}
          </div>
          <div className="relative flex-shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workers..."
              className="input pl-8 w-56"
            />
          </div>
        </div>

        {error ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : (
          <WorkerList workers={filteredWorkers} loading={loading} />
        )}
      </div>

      {/* Add Worker Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Add New Worker</h2>
                <p className="text-xs text-slate-500 mt-0.5">Create a worker account for the mobile app</p>
              </div>
              <button
                onClick={() => { setShowModal(false); setFormError(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddWorker} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">First Name *</label>
                  <input
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="input"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Last Name *</label>
                  <input
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="input"
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input"
                  placeholder="john.smith@company.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Password *</label>
                <input
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input"
                  placeholder="Minimum 6 characters"
                />
                <p className="text-xs text-slate-400 mt-1">Worker uses this to log into the mobile app</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input"
                  placeholder="+1 555 000 0000"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Transport Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'on_foot', label: 'On Foot', icon: '🚶' },
                    { value: 'bicycle', label: 'Bicycle', icon: '🚲' },
                    { value: 'vehicle', label: 'Vehicle', icon: '🚗' },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setForm({ ...form, transportMode: mode.value, vehicleId: mode.value !== 'vehicle' ? '' : form.vehicleId })}
                      className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border text-xs font-medium transition-colors ${
                        form.transportMode === mode.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-lg">{mode.icon}</span>
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.transportMode === 'vehicle' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Vehicle ID</label>
                  <input
                    value={form.vehicleId}
                    onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                    className="input"
                    placeholder="e.g. Truck-01, Van-03"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setFormError(null); setForm({ firstName:'', lastName:'', email:'', phone:'', transportMode:'vehicle', vehicleId:'', password:'Worker1234!' }); }}
                  className="btn-secondary flex-1 justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 justify-center disabled:opacity-60"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Create Worker
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
