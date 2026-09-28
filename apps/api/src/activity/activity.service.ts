import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobEntity } from '../jobs/entities/job.entity';
import { CheckInEntity } from '../geofencing/entities/checkin.entity';

export interface ActivityEvent {
  id: string;
  type: 'job_created' | 'job_status_changed' | 'job_assigned' | 'job_completed' | 'checkin' | 'checkout';
  description: string;
  workerName: string | null;
  workerId: string | null;
  jobTitle: string | null;
  jobId: string | null;
  timestamp: Date;
  meta: Record<string, any>;
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
    @InjectRepository(CheckInEntity)
    private readonly checkinRepo: Repository<CheckInEntity>,
  ) {}

  async getActivityLog(opts: {
    workerId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ events: ActivityEvent[]; total: number }> {
    const from = opts.from ?? new Date(Date.now() - 7 * 864e5);
    const to = opts.to ?? new Date();
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 50, 200);

    // --- Job events ---
    const jobQb = this.jobRepo
      .createQueryBuilder('j')
      .leftJoinAndSelect('j.assignedWorker', 'worker')
      .leftJoinAndSelect('j.createdBy', 'creator')
      .where('j.createdAt BETWEEN :from AND :to', { from, to })
      .orderBy('j.createdAt', 'DESC');

    if (opts.workerId) {
      jobQb.andWhere('j.assignedWorkerId = :wid', { wid: opts.workerId });
    }
    const jobs = await jobQb.getMany();

    const jobEvents: ActivityEvent[] = [];
    for (const j of jobs) {
      jobEvents.push({
        id: `job-created-${j.id}`,
        type: 'job_created',
        description: `Job "${j.title}" was created`,
        workerName: j.createdBy
          ? `${j.createdBy.firstName} ${j.createdBy.lastName}`
          : null,
        workerId: j.createdById ?? null,
        jobTitle: j.title,
        jobId: j.id,
        timestamp: j.createdAt,
        meta: { status: j.status, priority: j.priority },
      });

      if (j.assignedWorker && j.status !== 'pending') {
        jobEvents.push({
          id: `job-assigned-${j.id}`,
          type: 'job_assigned',
          description: `Job "${j.title}" assigned to ${j.assignedWorker.firstName} ${j.assignedWorker.lastName}`,
          workerName: `${j.assignedWorker.firstName} ${j.assignedWorker.lastName}`,
          workerId: j.assignedWorkerId ?? null,
          jobTitle: j.title,
          jobId: j.id,
          timestamp: j.updatedAt ?? j.createdAt,
          meta: { workerId: j.assignedWorkerId },
        });
      }

      if (j.status === 'completed' && j.actualEndAt) {
        jobEvents.push({
          id: `job-completed-${j.id}`,
          type: 'job_completed',
          description: `Job "${j.title}" was completed`,
          workerName: j.assignedWorker
            ? `${j.assignedWorker.firstName} ${j.assignedWorker.lastName}`
            : null,
          workerId: j.assignedWorkerId ?? null,
          jobTitle: j.title,
          jobId: j.id,
          timestamp: j.actualEndAt,
          meta: { completedAt: j.actualEndAt },
        });
      }
    }

    // --- Check-in events ---
    const ciQb = this.checkinRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.worker', 'w')
      .leftJoinAndSelect('c.geofence', 'g')
      .where('c.timestamp BETWEEN :from AND :to', { from, to })
      .orderBy('c.timestamp', 'DESC');

    if (opts.workerId) {
      ciQb.andWhere('c.workerId = :wid', { wid: opts.workerId });
    }
    const checkins = await ciQb.getMany();

    const checkinEvents: ActivityEvent[] = checkins.map((c) => ({
      id: `checkin-${c.id}`,
      type: c.eventType === 'check_in' ? 'checkin' : 'checkout',
      description:
        c.eventType === 'check_in'
          ? `${c.worker?.firstName ?? ''} ${c.worker?.lastName ?? ''} checked in at ${c.geofence?.name ?? 'a zone'}`
          : `${c.worker?.firstName ?? ''} ${c.worker?.lastName ?? ''} checked out of ${c.geofence?.name ?? 'a zone'}`,
      workerName: c.worker
        ? `${c.worker.firstName} ${c.worker.lastName}`
        : null,
      workerId: c.workerId,
      jobTitle: null,
      jobId: c.jobId ?? null,
      timestamp: c.timestamp,
      meta: {
        geofenceId: c.geofenceId,
        latitude: c.latitude,
        longitude: c.longitude,
      },
    }));

    // Merge and sort
    const allEvents = [...jobEvents, ...checkinEvents].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );

    const total = allEvents.length;
    const paged = allEvents.slice((page - 1) * limit, page * limit);

    return { events: paged, total };
  }
}
