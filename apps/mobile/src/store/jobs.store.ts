import { create } from 'zustand';
import { Job, JobStatus } from '@fieldops/shared';

interface JobsState {
  jobs: Job[];
  currentJobId: string | null;
  loading: boolean;
  error: string | null;

  setJobs: (jobs: Job[]) => void;
  addJob: (job: Job) => void;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
  removeJob: (jobId: string) => void;
  setCurrentJob: (jobId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useJobsStore = create<JobsState>((set) => ({
  jobs: [],
  currentJobId: null,
  loading: false,
  error: null,

  setJobs: (jobs) => set({ jobs }),

  addJob: (job) =>
    set((state) => ({
      jobs: [job, ...state.jobs.filter((j) => j.id !== job.id)],
    })),

  updateJob: (jobId, updates) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === jobId ? { ...j, ...updates } : j)),
    })),

  removeJob: (jobId) =>
    set((state) => ({ jobs: state.jobs.filter((j) => j.id !== jobId) })),

  setCurrentJob: (jobId) => set({ currentJobId: jobId }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
