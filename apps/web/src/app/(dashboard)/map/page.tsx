'use client';

import { Header } from '@/components/ui/Header';
import { LiveMap } from '@/components/map/LiveMap';
import { HistoryMap } from '@/components/map/HistoryMap';
import { useWorkers } from '@/hooks/useWorkers';
import { useSocket } from '@/hooks/useSocket';
import { SOCKET_EVENTS, LiveLocationUpdate } from '@fieldops/shared';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function MapPage() {
  const { workers, loading } = useWorkers();
  const { on, isConnected } = useSocket();
  const [liveUpdates, setLiveUpdates] = useState(0);

  // Tab state
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');

  // History tab state
  const [historyWorkerId, setHistoryWorkerId] = useState('');
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyPoints, setHistoryPoints] = useState<any[]>([]);
  const [historyWorkerName, setHistoryWorkerName] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const remove = on(SOCKET_EVENTS.LOCATION_BROADCAST, () => {
      setLiveUpdates((n) => n + 1);
    });
    return remove;
  }, [on]);

  const fetchHistory = async () => {
    if (!historyWorkerId) return;
    setHistoryLoading(true);
    try {
      const from = new Date(historyDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(historyDate);
      to.setHours(23, 59, 59, 999);
      const res = await api.get(`/tracking/workers/${historyWorkerId}/history`, {
        params: { startDate: from.toISOString(), endDate: to.toISOString(), limit: 500 },
      });
      setHistoryPoints(res.data || []);
      const w = workers.find(w => w.id === historyWorkerId);
      setHistoryWorkerName(w ? `${w.firstName} ${w.lastName}` : '');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Map"
        subtitle="Worker locations and tracking"
        helpItems={[
          { icon: '📍', title: 'Worker pins', text: 'Each pin on the map is a worker. Click a pin to see their name, status, and last known coordinates.' },
          { icon: '🟢', title: 'Live indicator', text: 'The green "Live" badge means the WebSocket connection is active. Updates appear automatically as workers move.' },
          { icon: '📡', title: 'GPS updates', text: 'Workers share their location every few seconds via the mobile app. If a worker goes offline, their pin stays at the last known position.' },
          { icon: '🕐', title: 'History playback', text: 'Switch to the History tab to replay a worker\'s route for any given day. Use the play/pause controls and scrubber to step through their path.' },
          { icon: '🔄', title: 'No workers showing?', text: 'Make sure the worker has the mobile app open and location permissions granted. They also need to be logged in and have an active job.' },
        ]}
        actions={
          <div className="flex items-center gap-2 text-sm">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full
              ${isConnected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
            >
              <div
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}
              />
              {isConnected ? `Live · ${liveUpdates} updates` : 'Connecting...'}
            </div>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">
              {workers.length} workers
            </span>
          </div>
        }
      />

      {/* Tab switcher */}
      <div className="px-6 pt-3 pb-0 border-b border-slate-200 bg-white flex items-center gap-0">
        <button
          onClick={() => setActiveTab('live')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'live'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Live
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          History
        </button>
      </div>

      {activeTab === 'live' ? (
        <div className="flex-1" style={{ height: 'calc(100vh - 180px)' }}>
          <LiveMap
            initialWorkers={loading ? [] : workers}
            className="w-full h-full"
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col p-6 gap-4 overflow-auto">
          {/* History controls */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Worker</label>
              <select
                value={historyWorkerId}
                onChange={e => { setHistoryWorkerId(e.target.value); setHistoryPoints([]); }}
                className="input w-52"
                disabled={loading}
              >
                <option value="">Select worker...</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.firstName} {w.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Date</label>
              <input
                type="date"
                value={historyDate}
                onChange={e => { setHistoryDate(e.target.value); setHistoryPoints([]); }}
                className="input w-44"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <button
              onClick={fetchHistory}
              disabled={!historyWorkerId || historyLoading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {historyLoading ? 'Loading...' : 'Fetch History'}
            </button>
            {historyPoints.length > 0 && (
              <span className="text-xs text-slate-500 self-end pb-1.5">
                {historyPoints.length} points found
              </span>
            )}
          </div>

          {/* History map */}
          <div className="flex-1" style={{ minHeight: 500 }}>
            <HistoryMap
              workerId={historyWorkerId}
              workerName={historyWorkerName}
              points={historyPoints}
            />
          </div>
        </div>
      )}
    </div>
  );
}
