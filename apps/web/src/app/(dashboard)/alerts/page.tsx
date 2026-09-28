'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/ui/Header';
import api from '@/lib/api';
import { RefreshCw, Plus, Trash2, Bell, BellOff, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AlertRule {
  id: string;
  name: string;
  trigger: string;
  isActive: boolean;
  conditions: Record<string, unknown>;
  actions: { email?: string[] };
  createdAt: string;
}

interface AlertEvent {
  id: string;
  ruleName?: string;
  message: string;
  workerId?: string;
  createdAt: string;
}

type TabType = 'rules' | 'events';

const TRIGGER_OPTIONS = [
  { value: 'geofence_enter',  label: 'Geofence Enter' },
  { value: 'geofence_exit',   label: 'Geofence Exit' },
  { value: 'job_completed',   label: 'Job Completed' },
  { value: 'job_overdue',     label: 'Job Overdue' },
  { value: 'worker_offline',  label: 'Worker Offline' },
  { value: 'idle_too_long',   label: 'Idle Too Long' },
];

const TRIGGER_LABELS: Record<string, string> = Object.fromEntries(
  TRIGGER_OPTIONS.map((o) => [o.value, o.label]),
);

// ─── Tab button helper ────────────────────────────────────────────────────────

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
      className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
      }`}
    >
      {label}
    </button>
  );
}

// ─── New Rule Form ────────────────────────────────────────────────────────────

interface NewRuleFormProps {
  onSave: () => void;
  onCancel: () => void;
}

function NewRuleForm({ onSave, onCancel }: NewRuleFormProps) {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('geofence_enter');
  const [emailRecipients, setEmailRecipients] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const emails = emailRecipients
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await api.post('/alerts/rules', {
        name: name.trim(),
        trigger,
        conditions: {},
        actions: { email: emails },
        isActive,
      });
      onSave();
    } catch {
      setError('Failed to create rule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-5 border border-blue-200 bg-blue-50/30">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">New Alert Rule</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Name</label>
            <input
              className="input"
              placeholder="e.g. Worker offline alert"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Trigger</label>
            <select
              className="input"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
            >
              {TRIGGER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            Email Recipients <span className="text-slate-400 font-normal">(comma-separated)</span>
          </label>
          <input
            className="input"
            placeholder="admin@example.com, ops@example.com"
            value={emailRecipients}
            onChange={(e) => setEmailRecipients(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="rule-active"
            type="checkbox"
            className="w-4 h-4 accent-blue-600"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <label htmlFor="rule-active" className="text-sm text-slate-700">Active</label>
        </div>

        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Create Rule'}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('rules');

  // Rules state
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);

  // Events state
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // ── Fetch rules ──────────────────────────────────────────────────────────
  const fetchRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const res = await api.get<AlertRule[]>('/alerts/rules');
      setRules(res.data);
    } catch (err) {
      console.error('Failed to load alert rules:', err);
    } finally {
      setRulesLoading(false);
    }
  }, []);

  // ── Fetch events ─────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await api.get<AlertEvent[]>('/alerts/events', { params: { limit: 50 } });
      setEvents(res.data);
    } catch (err) {
      console.error('Failed to load alert events:', err);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);
  useEffect(() => { if (activeTab === 'events') fetchEvents(); }, [activeTab, fetchEvents]);

  // ── Toggle rule active ────────────────────────────────────────────────────
  const toggleRule = async (rule: AlertRule) => {
    try {
      await api.put(`/alerts/rules/${rule.id}`, { isActive: !rule.isActive });
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r)),
      );
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  // ── Delete rule ───────────────────────────────────────────────────────────
  const deleteRule = async (rule: AlertRule) => {
    if (!confirm(`Delete rule "${rule.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/alerts/rules/${rule.id}`);
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  return (
    <div>
      <Header
        title="Alerts"
        subtitle="Manage alert rules and view triggered events"
        actions={
          activeTab === 'rules' ? (
            <button
              className="btn-primary"
              onClick={() => setShowNewRuleForm((v) => !v)}
            >
              <Plus className="w-4 h-4" />
              New Rule
            </button>
          ) : (
            <button
              className="btn-secondary"
              onClick={fetchEvents}
              disabled={eventsLoading}
            >
              <RefreshCw className={`w-4 h-4 ${eventsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )
        }
      />

      <div className="p-6 space-y-5">
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <TabBtn label="Rules" active={activeTab === 'rules'} onClick={() => setActiveTab('rules')} />
          <TabBtn label="Events" active={activeTab === 'events'} onClick={() => setActiveTab('events')} />
        </div>

        {/* ── Rules Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            {showNewRuleForm && (
              <NewRuleForm
                onSave={() => { setShowNewRuleForm(false); fetchRules(); }}
                onCancel={() => setShowNewRuleForm(false)}
              />
            )}

            {rulesLoading ? (
              <div className="card p-10 text-center text-slate-400 text-sm">Loading rules...</div>
            ) : rules.length === 0 ? (
              <div className="card p-12 text-center">
                <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500">No alert rules yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Click &ldquo;New Rule&rdquo; to create your first alert.
                </p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trigger</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Recipients</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Active</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-900">{rule.name}</td>
                        <td className="px-4 py-3">
                          <span className="badge badge-info text-xs">
                            {TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {rule.actions?.email?.length
                            ? rule.actions.email.join(', ')
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleRule(rule)}
                            title={rule.isActive ? 'Disable rule' : 'Enable rule'}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                              rule.isActive
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {rule.isActive
                              ? <Bell className="w-4 h-4" />
                              : <BellOff className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => deleteRule(rule)}
                            className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Events Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'events' && (
          <div>
            {eventsLoading ? (
              <div className="card p-10 text-center text-slate-400 text-sm">Loading events...</div>
            ) : events.length === 0 ? (
              <div className="card p-12 text-center">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500">No alert events</p>
                <p className="text-xs text-slate-400 mt-1">Events will appear here when alert rules are triggered.</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Recent Events</p>
                  <p className="text-xs text-slate-400">{events.length} event{events.length !== 1 ? 's' : ''}</p>
                </div>
                <ul className="divide-y divide-slate-100">
                  {events.map((event) => (
                    <li key={event.id} className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex-shrink-0 mt-0.5 w-2 h-2 rounded-full bg-amber-400 mt-2" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {event.ruleName && (
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              {event.ruleName}
                            </span>
                          )}
                          {event.workerId && (
                            <span className="text-xs text-slate-500">
                              Worker: <span className="font-mono text-slate-700">{event.workerId.slice(0, 8)}&hellip;</span>
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 mt-1">{event.message}</p>
                      </div>
                      <time className="flex-shrink-0 text-xs text-slate-400 whitespace-nowrap">
                        {format(new Date(event.createdAt), 'MMM d, HH:mm')}
                      </time>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
