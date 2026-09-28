'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export interface WorkerData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  vehicleId?: string;
  phone?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  lastSeenAt?: string;
}

export function useWorkers() {
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<WorkerData[]>('/users/workers');
      setWorkers(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load workers');
      console.error('Failed to load workers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActiveWorkers = useCallback(async () => {
    try {
      const response = await api.get<WorkerData[]>('/users/workers/active');
      return response.data;
    } catch (err) {
      console.error('Failed to load active workers:', err);
      return [];
    }
  }, []);

  const updateWorkerLocation = useCallback(
    (workerId: string, latitude: number, longitude: number, status: string) => {
      setWorkers((prev) =>
        prev.map((w) =>
          w.id === workerId
            ? { ...w, currentLatitude: latitude, currentLongitude: longitude, status }
            : w,
        ),
      );
    },
    [],
  );

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  return {
    workers,
    loading,
    error,
    fetchWorkers,
    fetchActiveWorkers,
    updateWorkerLocation,
  };
}
