'use client';

import { useRouter } from 'next/navigation';
import { Header } from '@/components/ui/Header';
import { JobForm } from '@/components/jobs/JobForm';
import api from '@/lib/api';

export default function NewJobPage() {
  const router = useRouter();

  const handleSubmit = async (data: Parameters<typeof JobForm>[0]['initialData'] & {
    title: string;
    address: { street: string; city: string; state: string; postalCode: string; country?: string };
  }) => {
    await api.post('/jobs', data);
    router.push('/jobs');
  };

  return (
    <div className="max-w-2xl">
      <Header
        title="Create Job"
        subtitle="Dispatch a new field job to a worker"
      />
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <JobForm
          onSubmit={handleSubmit as Parameters<typeof JobForm>[0]['onSubmit']}
          onCancel={() => router.push('/jobs')}
        />
      </div>
    </div>
  );
}
