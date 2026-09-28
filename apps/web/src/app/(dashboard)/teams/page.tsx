'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/ui/Header';
import api from '@/lib/api';
import { Plus, Trash2, Users2, ChevronDown, ChevronUp, X, AlertCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  managerId: string;
  manager: { firstName: string; lastName: string; email: string } | null;
  members: TeamMember[];
  isActive: boolean;
  createdAt: string;
}

// ─── Color picker presets ─────────────────────────────────────────────────────

const PRESET_COLORS = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
];

// ─── New Team Modal ───────────────────────────────────────────────────────────

interface NewTeamModalProps {
  onSave: () => void;
  onClose: () => void;
}

function NewTeamModal({ onSave, onClose }: NewTeamModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0].value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/teams', {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
      onSave();
    } catch {
      setError('Failed to create team. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">New Team</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Team Name</label>
            <input
              className="input"
              placeholder="e.g. North Region"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="What does this team handle?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-600">Team Color</label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                    color === c.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Creating...' : 'Create Team'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Team Card ────────────────────────────────────────────────────────────────

interface TeamCardProps {
  team: Team;
  onDelete: (team: Team) => void;
}

function TeamCard({ team, onDelete }: TeamCardProps) {
  const [expanded, setExpanded] = useState(false);

  const badgeColor = team.color ?? '#3B82F6';
  const managerName = team.manager
    ? `${team.manager.firstName} ${team.manager.lastName}`
    : '—';

  return (
    <div className="card overflow-hidden">
      {/* Card header */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Color badge */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: badgeColor }}
        >
          {team.name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{team.name}</p>
          {team.description && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{team.description}</p>
          )}
          <p className="text-xs text-slate-400 mt-0.5">Manager: {managerName}</p>
        </div>

        {/* Member count + expand indicator */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1 text-sm text-slate-500">
            <Users2 className="w-4 h-4" />
            <span>{team.members.length}</span>
          </div>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Expanded member list */}
      {expanded && (
        <div className="border-t border-slate-100">
          {team.members.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-400 text-center">No members yet</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {team.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: badgeColor }}
                  >
                    {(m.firstName?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {m.firstName} {m.lastName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{m.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Delete team */}
          <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(team); }}
              className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Team
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Team[]>('/teams');
      setTeams(res.data);
    } catch (err) {
      console.error('Failed to load teams:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const handleDelete = async (team: Team) => {
    if (!confirm(`Delete team "${team.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/teams/${team.id}`);
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
    } catch (err) {
      console.error('Failed to delete team:', err);
    }
  };

  return (
    <div>
      <Header
        title="Teams"
        subtitle="Organise workers into teams"
        actions={
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            New Team
          </button>
        }
      />

      <div className="p-6">
        {loading ? (
          <div className="card p-10 text-center text-slate-400 text-sm">Loading teams...</div>
        ) : teams.length === 0 ? (
          <div className="card p-12 text-center">
            <Users2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">No teams yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Click &ldquo;New Team&rdquo; to create your first team.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <NewTeamModal
          onSave={() => { setShowModal(false); fetchTeams(); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
