'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Header } from '@/components/ui/Header';
import { JobCard } from '@/components/jobs/JobCard';
import { useJobs } from '@/hooks/useJobs';
import { useSocket } from '@/hooks/useSocket';
import { JobStatus, SOCKET_EVENTS } from '@fieldops/shared';
import { useEffect } from 'react';
import { Search, Plus, ClipboardList, Upload, X, Download, CheckCircle, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

const statusFilters: { label: string; value: JobStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: JobStatus.PENDING },
  { label: 'Assigned', value: JobStatus.ASSIGNED },
  { label: 'Dispatched', value: JobStatus.DISPATCHED },
  { label: 'In Progress', value: JobStatus.IN_PROGRESS },
  { label: 'On Site', value: JobStatus.ON_SITE },
  { label: 'Completed', value: JobStatus.COMPLETED },
  { label: 'Cancelled', value: JobStatus.CANCELLED },
];

export default function JobsPage() {
  const [activeStatus, setActiveStatus] = useState<JobStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const { jobs, loading, error, updateJob, fetchJobs } = useJobs({
    status: activeStatus || undefined,
  });
  const { on } = useSocket();

  // CSV import state
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<{ imported: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for real-time job updates
  useEffect(() => {
    const remove = on(SOCKET_EVENTS.JOB_UPDATED, (data: unknown) => {
      updateJob(data as Parameters<typeof updateJob>[0]);
    });
    return remove;
  }, [on, updateJob]);

  const filteredJobs = jobs.filter((job) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      job.title.toLowerCase().includes(q) ||
      job.addressCity.toLowerCase().includes(q) ||
      job.addressStreet.toLowerCase().includes(q) ||
      (job.assignedWorker &&
        `${job.assignedWorker.firstName} ${job.assignedWorker.lastName}`
          .toLowerCase()
          .includes(q))
    );
  });

  const downloadTemplate = () => {
    const csv =
      'title,description,priority,street,city,state,postal code,country,scheduled start,tags\n' +
      '"Fix HVAC Unit","Repair the air conditioning unit","high","123 Main St","Chicago","IL","60601","US","2024-12-01T09:00:00","maintenance;urgent"\n' +
      '"Install Security Camera","","medium","456 Oak Ave","Chicago","IL","60602","US","","installation"';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jobs-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = async () => {
    if (!csvFile) return;
    setCsvImporting(true);
    setCsvResult(null);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      const res = await api.post('/jobs/import/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCsvResult(res.data);
      if (res.data.imported > 0) {
        fetchJobs?.();
      }
    } catch (e: any) {
      setCsvResult({
        imported: 0,
        failed: 1,
        errors: [e?.response?.data?.message || e.message || 'Import failed'],
      });
    } finally {
      setCsvImporting(false);
    }
  };

  const closeModal = () => {
    setCsvModalOpen(false);
    setCsvFile(null);
    setCsvResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      <Header
        title="Jobs"
        subtitle={`${jobs.length} job${jobs.length !== 1 ? 's' : ''}`}
        helpItems={[
          { icon: '➕', title: 'Creating a job', text: 'Click "New Job" to fill in the job title, address, priority, and scheduled time. You can optionally assign a worker right away.' },
          { icon: '👤', title: 'Assigning a worker', text: 'After creating a job, use the ⋯ menu on the job row → Assign to pick a worker. The job moves to "Assigned" status.' },
          { icon: '📤', title: 'Dispatching', text: 'Once assigned, use the ⋯ menu → Dispatch. This sends an instant notification to the worker\'s mobile app.' },
          { icon: '📥', title: 'CSV Import', text: 'Click "Import CSV" to bulk-create jobs from a spreadsheet. Download the template to see the required columns. Priority values: low, medium, high.' },
          { icon: '🔍', title: 'Filtering & searching', text: 'Use the status tabs (Pending, In Progress, etc.) to filter jobs. The search box matches job titles, addresses, and worker names.' },
          { icon: '🔄', title: 'Status flow', text: 'Pending → Assigned → Dispatched → In Progress → On Site → Completed. Workers update their own status from the mobile app.' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setCsvModalOpen(true); setCsvResult(null); }}
              className="btn-secondary flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
            <Link href="/jobs/new" className="btn-primary">
              <Plus className="w-4 h-4" />
              New Job
            </Link>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filter tabs + search row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Underline tab nav */}
          <div className="flex items-center gap-0 border-b border-slate-200 overflow-x-auto">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveStatus(f.value)}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px
                  ${
                    activeStatus === f.value
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jobs..."
              className="input pl-8 w-56"
            />
          </div>
        </div>

        {/* Jobs table */}
        {loading ? (
          <div className="card overflow-hidden">
            {/* Table header skeleton */}
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
              {[80, 60, 80, 100, 100].map((w, i) => (
                <div
                  key={i}
                  className="h-3 bg-slate-200 rounded animate-pulse"
                  style={{ width: w }}
                />
              ))}
            </div>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 h-14 border-b border-slate-50 animate-pulse"
              >
                <div className="w-2 h-2 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
                <div className="h-5 bg-slate-100 rounded-full w-20" />
                <div className="h-3.5 bg-slate-100 rounded w-24 hidden md:block" />
                <div className="h-3.5 bg-slate-100 rounded w-28 hidden lg:block" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="card p-12 text-center">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600 mb-1">No jobs found</p>
            <p className="text-xs text-slate-400 mb-4">
              {searchQuery ? 'Try adjusting your search.' : 'Get started by creating your first job.'}
            </p>
            {!searchQuery && (
              <Link href="/jobs/new" className="btn-primary inline-flex">
                <Plus className="w-4 h-4" />
                Create your first job
              </Link>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden">
            {/* Table header */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <div className="w-2 flex-shrink-0" />
              <div className="flex-1 text-xs font-medium text-slate-500 uppercase tracking-wide">
                Title
              </div>
              <div className="flex-shrink-0 hidden sm:block w-24 text-xs font-medium text-slate-500 uppercase tracking-wide">
                Status
              </div>
              <div className="flex-shrink-0 hidden md:block w-32 text-xs font-medium text-slate-500 uppercase tracking-wide">
                Worker
              </div>
              <div className="flex-shrink-0 hidden lg:block w-32 text-xs font-medium text-slate-500 uppercase tracking-wide">
                Scheduled
              </div>
              <div className="w-8 flex-shrink-0" />
            </div>
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* CSV Import Modal */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Import Jobs from CSV</h2>
                <p className="text-xs text-slate-500 mt-0.5">Bulk create jobs by uploading a CSV file</p>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Template download */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Need a template?</p>
                  <p className="text-xs text-slate-500 mt-0.5">Download a sample CSV with all supported columns</p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="btn-secondary flex items-center gap-1.5 flex-shrink-0 text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Template
                </button>
              </div>

              {/* File input */}
              {!csvResult && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Select CSV file
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={e => setCsvFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-lg p-1"
                  />
                  {csvFile && (
                    <p className="text-xs text-slate-500 mt-1.5">
                      Selected: <span className="font-medium text-slate-700">{csvFile.name}</span>{' '}
                      ({(csvFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              )}

              {/* Results */}
              {csvResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-100 flex-1">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-green-800">{csvResult.imported} imported</p>
                      </div>
                    </div>
                    {csvResult.failed > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-100 flex-1">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-red-700">{csvResult.failed} failed</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {csvResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 max-h-36 overflow-y-auto">
                      <p className="text-xs font-medium text-red-700 mb-1.5">Errors:</p>
                      {csvResult.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-600">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex items-center justify-end gap-2">
              <button onClick={closeModal} className="btn-secondary">
                {csvResult ? 'Close' : 'Cancel'}
              </button>
              {!csvResult && (
                <button
                  onClick={handleImportCSV}
                  disabled={!csvFile || csvImporting}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {csvImporting ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Importing...
                    </span>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
