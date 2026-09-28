'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { WorkerData, useWorkers } from '@/hooks/useWorkers';
import { Plus, Trash2 } from 'lucide-react';

const customFieldSchema = z.object({
  key: z.string(),
  value: z.string(),
  type: z.enum(['text', 'number', 'checkbox', 'date']),
});

const jobSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assignedWorkerId: z.string().optional(),
  address: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    country: z.string().default('US'),
  }),
  scheduledStartAt: z.string().optional(),
  scheduledEndAt: z.string().optional(),
  estimatedDurationMinutes: z.number().min(1).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.array(customFieldSchema).optional(),
});

type JobFormData = z.infer<typeof jobSchema>;
type CustomField = { key: string; value: string; type: 'text' | 'number' | 'checkbox' | 'date' };

interface JobFormProps {
  onSubmit: (data: JobFormData) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<JobFormData>;
}

export function JobForm({ onSubmit, onCancel, initialData }: JobFormProps) {
  const { workers } = useWorkers();
  const [tagInput, setTagInput] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>(
    (initialData as any)?.customFields ?? [],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      priority: 'medium',
      address: { country: 'US' },
      tags: [],
      customFields: [],
      ...initialData,
    },
  });

  const tags = watch('tags') ?? [];

  const addCustomField = () => {
    const updated = [...customFields, { key: '', value: '', type: 'text' as const }];
    setCustomFields(updated);
    setValue('customFields', updated);
  };

  const updateCustomField = (index: number, field: Partial<CustomField>) => {
    const updated = customFields.map((f, i) => (i === index ? { ...f, ...field } : f));
    setCustomFields(updated);
    setValue('customFields', updated);
  };

  const removeCustomField = (index: number) => {
    const updated = customFields.filter((_, i) => i !== index);
    setCustomFields(updated);
    setValue('customFields', updated);
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setValue('tags', [...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setValue('tags', tags.filter((t) => t !== tag));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Job Title <span className="text-red-500">*</span>
        </label>
        <input
          {...register('title')}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. HVAC Maintenance at HQ"
        />
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          {...register('description')}
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Job details and special instructions..."
        />
      </div>

      {/* Priority + Worker */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            {...register('priority')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assign Worker</label>
          <select
            {...register('assignedWorkerId')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Unassigned</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.firstName} {w.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Address */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Job Address</h3>
        <div className="space-y-3">
          <input
            {...register('address.street')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Street address"
          />
          {errors.address?.street && (
            <p className="text-xs text-red-600">{errors.address.street.message}</p>
          )}
          <div className="grid grid-cols-3 gap-3">
            <input
              {...register('address.city')}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="City"
            />
            <input
              {...register('address.state')}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="State"
            />
            <input
              {...register('address.postalCode')}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ZIP"
            />
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date/Time</label>
          <input
            type="datetime-local"
            {...register('scheduledStartAt')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date/Time</label>
          <input
            type="datetime-local"
            {...register('scheduledEndAt')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add tag and press Enter"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Add
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Custom Fields */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Custom Fields</label>
          <button
            type="button"
            onClick={addCustomField}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Field
          </button>
        </div>
        {customFields.length === 0 && (
          <p className="text-xs text-slate-400 italic">No custom fields. Click "Add Field" to add one.</p>
        )}
        <div className="space-y-2">
          {customFields.map((field, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input
                type="text"
                value={field.key}
                onChange={(e) => updateCustomField(index, { key: e.target.value })}
                className="flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Field name"
              />
              <input
                type="text"
                value={field.value}
                onChange={(e) => updateCustomField(index, { value: e.target.value })}
                className="flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Value"
              />
              <select
                value={field.type}
                onChange={(e) => updateCustomField(index, { type: e.target.value as CustomField['type'] })}
                className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="checkbox">Checkbox</option>
                <option value="date">Date</option>
              </select>
              <button
                type="button"
                onClick={() => removeCustomField(index)}
                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50"
                aria-label="Remove field"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2.5 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Create Job'}
        </button>
      </div>
    </form>
  );
}
