'use client';

import { useState, useRef, useCallback } from 'react';
import { Header } from '@/components/ui/Header';
import { useJobs, JobData } from '@/hooks/useJobs';
import { useWorkers } from '@/hooks/useWorkers';
import { JOB_PRIORITY_COLORS } from '@fieldops/shared';
import { JobStatus } from '@fieldops/shared';
import api from '@/lib/api';
import { GripVertical, CalendarClock, User } from 'lucide-react';

// ─── Column config ─────────────────────────────────────────────────────────────

interface ColumnConfig {
  status: JobStatus;
  label: string;
  headerBg: string;
  headerText: string;
  borderColor: string;
  dotColor: string;
  dropActiveBorder: string;
  emptyBg: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    status: JobStatus.PENDING,
    label: 'Pending',
    headerBg: 'bg-slate-100',
    headerText: 'text-slate-700',
    borderColor: 'border-slate-200',
    dotColor: 'bg-slate-400',
    dropActiveBorder: 'border-blue-400 bg-blue-50',
    emptyBg: 'border-slate-200',
  },
  {
    status: JobStatus.ASSIGNED,
    label: 'Assigned',
    headerBg: 'bg-blue-50',
    headerText: 'text-blue-700',
    borderColor: 'border-blue-200',
    dotColor: 'bg-blue-500',
    dropActiveBorder: 'border-blue-400 bg-blue-50',
    emptyBg: 'border-blue-200',
  },
  {
    status: JobStatus.DISPATCHED,
    label: 'Dispatched',
    headerBg: 'bg-purple-50',
    headerText: 'text-purple-700',
    borderColor: 'border-purple-200',
    dotColor: 'bg-purple-500',
    dropActiveBorder: 'border-blue-400 bg-blue-50',
    emptyBg: 'border-purple-200',
  },
  {
    status: JobStatus.IN_PROGRESS,
    label: 'In Progress',
    headerBg: 'bg-amber-50',
    headerText: 'text-amber-700',
    borderColor: 'border-amber-200',
    dotColor: 'bg-amber-500',
    dropActiveBorder: 'border-blue-400 bg-blue-50',
    emptyBg: 'border-amber-200',
  },
  {
    status: JobStatus.ON_SITE,
    label: 'On Site',
    headerBg: 'bg-orange-50',
    headerText: 'text-orange-700',
    borderColor: 'border-orange-200',
    dotColor: 'bg-orange-500',
    dropActiveBorder: 'border-blue-400 bg-blue-50',
    emptyBg: 'border-orange-200',
  },
  {
    status: JobStatus.COMPLETED,
    label: 'Completed',
    headerBg: 'bg-green-50',
    headerText: 'text-green-700',
    borderColor: 'border-green-200',
    dotColor: 'bg-green-500',
    dropActiveBorder: 'border-blue-400 bg-blue-50',
    emptyBg: 'border-green-200',
  },
];

// ─── Draggable Job Card ────────────────────────────────────────────────────────

interface DraggableJobCardProps {
  job: JobData;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, jobId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

function DraggableJobCard({ job, isDragging, onDragStart, onDragEnd }: DraggableJobCardProps) {
  const priorityColor = JOB_PRIORITY_COLORS[job.priority] ?? '#94a3b8';
  const workerName = job.assignedWorker
    ? `${job.assignedWorker.firstName} ${job.assignedWorker.lastName}`
    : null;

  const scheduledDate = job.scheduledStartAt
    ? new Date(job.scheduledStartAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, job.id)}
      onDragEnd={onDragEnd}
      className={`
        bg-white rounded-lg border border-slate-200 shadow-sm
        cursor-grab active:cursor-grabbing
        select-none transition-all duration-150
        hover:shadow-md hover:border-slate-300
        ${isDragging ? 'opacity-40 scale-95 rotate-1 shadow-lg' : 'opacity-100'}
      `}
      style={{ borderLeftWidth: '3px', borderLeftColor: priorityColor }}
    >
      <div className="p-3">
        {/* Top row: grip + title */}
        <div className="flex items-start gap-1.5">
          <GripVertical className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 leading-snug line-clamp-2">
              {job.title}
            </p>
          </div>
          {/* Priority dot */}
          <div
            className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
            style={{ backgroundColor: priorityColor }}
            title={job.priority}
          />
        </div>

        {/* Worker */}
        <div className="mt-2 flex items-center gap-1.5">
          <User className="w-3 h-3 text-slate-300 flex-shrink-0" />
          {workerName ? (
            <span className="text-xs text-slate-600 truncate">{workerName}</span>
          ) : (
            <span className="text-xs text-slate-400 italic">Unassigned</span>
          )}
        </div>

        {/* Scheduled */}
        {scheduledDate && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <CalendarClock className="w-3 h-3 text-slate-300 flex-shrink-0" />
            <span className="text-xs text-slate-500">{scheduledDate}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Column ────────────────────────────────────────────────────────────────────

interface ColumnProps {
  config: ColumnConfig;
  jobs: JobData[];
  dragOverStatus: JobStatus | null;
  draggingJobId: string | null;
  onDragStart: (e: React.DragEvent, jobId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent, status: JobStatus) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: JobStatus) => void;
}

function DispatchColumn({
  config,
  jobs,
  dragOverStatus,
  draggingJobId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: ColumnProps) {
  const isOver = dragOverStatus === config.status;

  return (
    <div
      className="flex flex-col flex-shrink-0 w-60"
      style={{ height: 'calc(100vh - 65px)' }}
    >
      {/* Column header */}
      <div
        className={`flex items-center justify-between px-3 py-2.5 rounded-t-lg border ${config.headerBg} ${config.borderColor} border-b-0`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
          <span className={`text-xs font-semibold uppercase tracking-wide ${config.headerText}`}>
            {config.label}
          </span>
        </div>
        <span
          className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${config.headerBg} ${config.headerText} border ${config.borderColor}`}
        >
          {jobs.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => onDragOver(e, config.status)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, config.status)}
        className={`
          flex-1 overflow-y-auto rounded-b-lg border p-2 space-y-2
          transition-colors duration-150
          ${isOver ? config.dropActiveBorder + ' border-2' : config.borderColor + ' border bg-slate-50/50'}
        `}
      >
        {jobs.map((job) => (
          <DraggableJobCard
            key={job.id}
            job={job}
            isDragging={draggingJobId === job.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}

        {/* Empty state */}
        {jobs.length === 0 && (
          <div
            className={`
              h-24 flex items-center justify-center
              border-2 border-dashed rounded-lg
              text-xs text-slate-400
              ${isOver ? 'border-blue-300 text-blue-400' : config.emptyBg}
            `}
          >
            Drop jobs here
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DispatchPage() {
  const { jobs, loading, error, fetchJobs } = useJobs({ limit: 200 });
  const { workers } = useWorkers();

  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [draggingJobId, setDraggingJobId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<JobStatus | null>(null);

  // Optimistic local overrides: jobId → new status
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, JobStatus>>({});
  const dragLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve effective status (optimistic override or real)
  const effectiveStatus = useCallback(
    (job: JobData): JobStatus => {
      return (optimisticStatus[job.id] as JobStatus) ?? (job.status as JobStatus);
    },
    [optimisticStatus],
  );

  // Worker-filtered, then grouped by effective status
  const filteredJobs = selectedWorkerId
    ? jobs.filter((j) => j.assignedWorkerId === selectedWorkerId)
    : jobs;

  const jobsByStatus = COLUMNS.reduce<Record<string, JobData[]>>((acc, col) => {
    acc[col.status] = filteredJobs.filter((j) => effectiveStatus(j) === col.status);
    return acc;
  }, {});

  // ── DnD handlers ────────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, jobId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('jobId', jobId);
    setDraggingJobId(jobId);
  };

  const handleDragEnd = () => {
    setDraggingJobId(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (e: React.DragEvent, status: JobStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragLeaveTimerRef.current) {
      clearTimeout(dragLeaveTimerRef.current);
      dragLeaveTimerRef.current = null;
    }
    setDragOverStatus(status);
  };

  // Small debounce on drag-leave to avoid flicker when moving between children
  const handleDragLeave = (e: React.DragEvent) => {
    dragLeaveTimerRef.current = setTimeout(() => {
      setDragOverStatus(null);
    }, 80);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: JobStatus) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('jobId');
    if (!jobId) return;

    setDraggingJobId(null);
    setDragOverStatus(null);

    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    const prevStatus = effectiveStatus(job);
    if (prevStatus === newStatus) return;

    // Optimistic update
    setOptimisticStatus((prev) => ({ ...prev, [jobId]: newStatus }));

    try {
      await api.patch(`/jobs/${jobId}/status`, { status: newStatus });
      // Refresh to sync server state; keep optimistic until done
      await fetchJobs();
      setOptimisticStatus((prev) => {
        const next = { ...prev };
        delete next[jobId];
        return next;
      });
    } catch (err) {
      console.error('Failed to update job status:', err);
      // Revert optimistic update
      setOptimisticStatus((prev) => {
        const next = { ...prev };
        delete next[jobId];
        return next;
      });
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const workerFilterAction = (
    <div className="flex items-center gap-2">
      <label htmlFor="worker-filter" className="text-sm text-slate-500 whitespace-nowrap">
        Filter by worker:
      </label>
      <select
        id="worker-filter"
        value={selectedWorkerId}
        onChange={(e) => setSelectedWorkerId(e.target.value)}
        className="input text-sm py-1.5 pr-8 min-w-[160px]"
      >
        <option value="">All Workers</option>
        {workers.map((w) => (
          <option key={w.id} value={w.id}>
            {w.firstName} {w.lastName}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Dispatch Board"
        subtitle="Drag jobs between columns to update their status"
        actions={workerFilterAction}
      />

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm gap-2">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
            Loading jobs...
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="flex gap-3 px-4 py-4 overflow-x-auto h-full pb-4">
            {COLUMNS.map((col) => (
              <DispatchColumn
                key={col.status}
                config={col}
                jobs={jobsByStatus[col.status] ?? []}
                dragOverStatus={dragOverStatus}
                draggingJobId={draggingJobId}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
