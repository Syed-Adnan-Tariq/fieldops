'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { JobStatus } from '@fieldops/shared';

export interface JobData {
  id: string;
  title: string;
  description?: string;
  status: JobStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedWorkerId?: string;
  assignedWorker?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  addressStreet: string;
  addressCity: string;
  addressState: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface UseJobsOptions {
  status?: JobStatus;
  workerId?: string;
  page?: number;
  limit?: number;
}

export function useJobs(options: UseJobsOptions = {}) {
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page: options.page ?? 1,
        limit: options.limit ?? 20,
      };
      if (options.status) params.status = options.status;
      if (options.workerId) params.workerId = options.workerId;

      const response = await api.get<{ jobs: JobData[]; total: number }>('/jobs', {
        params,
      });
      setJobs(response.data.jobs);
      setTotal(response.data.total);
      setError(null);
    } catch (err) {
      setError('Failed to load jobs');
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [options.status, options.workerId, options.page, options.limit]);

  const createJob = useCallback(async (data: Partial<JobData>) => {
    const response = await api.post<JobData>('/jobs', data);
    setJobs((prev) => [response.data, ...prev]);
    return response.data;
  }, []);

  const updateJobStatus = useCallback(
    async (jobId: string, status: JobStatus) => {
      const response = await api.patch<JobData>(`/jobs/${jobId}/status`, { status });
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: response.data.status } : j)),
      );
      return response.data;
    },
    [],
  );

  const updateJob = useCallback((updatedJob: JobData) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)),
    );
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return {
    jobs,
    total,
    loading,
    error,
    fetchJobs,
    createJob,
    updateJobStatus,
    updateJob,
  };
}
