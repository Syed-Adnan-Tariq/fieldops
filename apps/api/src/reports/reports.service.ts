import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { JobEntity } from '../jobs/entities/job.entity';
import { LocationEntity } from '../tracking/entities/location.entity';
import { CheckInEntity } from '../geofencing/entities/checkin.entity';
import { UserEntity } from '../users/entities/user.entity';
import { TrackingService } from '../tracking/tracking.service';
import {
  JobStatus,
  UserRole,
  CheckInEventType,
  MileageReport,
  JobCompletionReport,
  TimesheetReport,
  OnSiteTimeReport,
} from '@fieldops/shared';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    @InjectRepository(LocationEntity)
    private readonly locationRepository: Repository<LocationEntity>,
    @InjectRepository(CheckInEntity)
    private readonly checkInRepository: Repository<CheckInEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly trackingService: TrackingService,
  ) {}

  async getMileageReport(options: {
    workerId?: string;
    startDate: Date;
    endDate: Date;
  }): Promise<MileageReport[]> {
    const workers = await this.userRepository.find({
      where: {
        role: UserRole.WORKER,
        isActive: true,
        ...(options.workerId ? { id: options.workerId } : {}),
      },
    });

    const reports: MileageReport[] = [];

    for (const worker of workers) {
      const locations = await this.trackingService.getWorkerHistory(
        worker.id,
        options.startDate,
        options.endDate,
        10000,
      );

      const totalMeters = await this.trackingService.calculateDistance(locations);

      // Group into trips (gaps > 30 min = new trip)
      let tripCount = 0;
      let lastTimestamp: Date | null = null;
      for (const loc of locations) {
        const ts = new Date(loc.timestamp);
        if (
          !lastTimestamp ||
          ts.getTime() - lastTimestamp.getTime() > 30 * 60 * 1000
        ) {
          tripCount++;
        }
        lastTimestamp = ts;
      }

      reports.push({
        workerId: worker.id,
        workerName: `${worker.firstName} ${worker.lastName}`,
        periodStart: options.startDate.toISOString(),
        periodEnd: options.endDate.toISOString(),
        totalDistanceMeters: totalMeters,
        totalDistanceMiles: totalMeters / 1609.344,
        totalDistanceKm: totalMeters / 1000,
        tripCount,
      });
    }

    return reports;
  }

  async getJobCompletionReport(options: {
    startDate: Date;
    endDate: Date;
  }): Promise<JobCompletionReport> {
    const jobs = await this.jobRepository.find({
      where: {
        createdAt: Between(options.startDate, options.endDate),
      },
      relations: ['assignedWorker'],
    });

    const total = jobs.length;
    const completed = jobs.filter((j) => j.status === JobStatus.COMPLETED).length;
    const cancelled = jobs.filter((j) => j.status === JobStatus.CANCELLED).length;
    const failed = jobs.filter((j) => j.status === JobStatus.FAILED).length;

    const completedJobs = jobs.filter(
      (j) => j.status === JobStatus.COMPLETED && j.actualStartAt && j.actualEndAt,
    );

    const avgDuration =
      completedJobs.length > 0
        ? completedJobs.reduce((sum, j) => {
            const start = new Date(j.actualStartAt!).getTime();
            const end = new Date(j.actualEndAt!).getTime();
            return sum + (end - start) / 60000;
          }, 0) / completedJobs.length
        : 0;

    // By worker stats
    const workerMap = new Map<
      string,
      { name: string; assigned: number; completed: number }
    >();

    for (const job of jobs) {
      if (!job.assignedWorkerId) continue;
      if (!workerMap.has(job.assignedWorkerId)) {
        const workerName = job.assignedWorker
          ? `${job.assignedWorker.firstName} ${job.assignedWorker.lastName}`
          : 'Unknown';
        workerMap.set(job.assignedWorkerId, {
          name: workerName,
          assigned: 0,
          completed: 0,
        });
      }
      const stats = workerMap.get(job.assignedWorkerId)!;
      stats.assigned++;
      if (job.status === JobStatus.COMPLETED) stats.completed++;
    }

    const byWorker = Array.from(workerMap.entries()).map(([workerId, stats]) => ({
      workerId,
      workerName: stats.name,
      assigned: stats.assigned,
      completed: stats.completed,
      completionRate:
        stats.assigned > 0 ? (stats.completed / stats.assigned) * 100 : 0,
    }));

    return {
      periodStart: options.startDate.toISOString(),
      periodEnd: options.endDate.toISOString(),
      totalJobs: total,
      completedJobs: completed,
      cancelledJobs: cancelled,
      failedJobs: failed,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      averageDurationMinutes: avgDuration,
      byWorker,
    };
  }

  async getTimesheetReport(options: {
    workerId?: string;
    startDate: Date;
    endDate: Date;
  }): Promise<TimesheetReport> {
    const checkIns = await this.checkInRepository.find({
      where: {
        ...(options.workerId ? { workerId: options.workerId } : {}),
        timestamp: Between(options.startDate, options.endDate),
      },
      order: { timestamp: 'ASC' },
    });

    // Group check-ins by worker and date
    const entriesMap = new Map<
      string,
      {
        workerId: string;
        date: string;
        checkInTime?: string;
        checkOutTime?: string;
        onSiteMinutes: number;
        jobsCompleted: number;
      }
    >();

    for (const ci of checkIns) {
      const date = new Date(ci.timestamp).toISOString().split('T')[0];
      const key = `${ci.workerId}:${date}`;

      if (!entriesMap.has(key)) {
        entriesMap.set(key, {
          workerId: ci.workerId,
          date,
          onSiteMinutes: 0,
          jobsCompleted: 0,
        });
      }

      const entry = entriesMap.get(key)!;
      if (ci.eventType === CheckInEventType.CHECK_IN && !entry.checkInTime) {
        entry.checkInTime = ci.timestamp.toISOString();
      }
      if (ci.eventType === CheckInEventType.CHECK_OUT) {
        entry.checkOutTime = ci.timestamp.toISOString();
      }
    }

    // Calculate on-site time
    for (const [, entry] of entriesMap) {
      if (entry.checkInTime && entry.checkOutTime) {
        const checkIn = new Date(entry.checkInTime).getTime();
        const checkOut = new Date(entry.checkOutTime).getTime();
        entry.onSiteMinutes = Math.max(0, (checkOut - checkIn) / 60000);
      }
    }

    // Load worker names
    const workers = await this.userRepository.find({
      where: { role: UserRole.WORKER },
      select: ['id', 'firstName', 'lastName'],
    });
    const workerNames = new Map(
      workers.map((w) => [w.id, `${w.firstName} ${w.lastName}`]),
    );

    const entries = Array.from(entriesMap.values()).map((e) => ({
      workerId: e.workerId,
      workerName: workerNames.get(e.workerId) ?? 'Unknown',
      date: e.date,
      checkInTime: e.checkInTime,
      checkOutTime: e.checkOutTime,
      totalOnSiteMinutes: e.onSiteMinutes,
      jobsCompleted: e.jobsCompleted,
    }));

    return {
      periodStart: options.startDate.toISOString(),
      periodEnd: options.endDate.toISOString(),
      entries,
    };
  }

  async getOnSiteTimeReport(options: {
    workerId?: string;
    startDate: Date;
    endDate: Date;
  }): Promise<OnSiteTimeReport[]> {
    const checkIns = await this.checkInRepository
      .createQueryBuilder('ci')
      .leftJoinAndSelect('ci.geofence', 'geofence')
      .where('ci.timestamp BETWEEN :start AND :end', {
        start: options.startDate,
        end: options.endDate,
      })
      .andWhere(options.workerId ? 'ci.workerId = :workerId' : '1=1', {
        workerId: options.workerId,
      })
      .orderBy('ci.workerId', 'ASC')
      .addOrderBy('ci.geofenceId', 'ASC')
      .addOrderBy('ci.timestamp', 'ASC')
      .getMany();

    const workers = await this.userRepository.find({
      where: { role: UserRole.WORKER },
      select: ['id', 'firstName', 'lastName'],
    });
    const workerNames = new Map(
      workers.map((w) => [w.id, `${w.firstName} ${w.lastName}`]),
    );

    // Match check-ins with check-outs
    const reports: OnSiteTimeReport[] = [];
    const pendingCheckIns = new Map<string, CheckInEntity>(); // key: workerId:geofenceId

    for (const ci of checkIns) {
      const key = `${ci.workerId}:${ci.geofenceId}`;

      if (ci.eventType === CheckInEventType.CHECK_IN) {
        pendingCheckIns.set(key, ci);
      } else if (ci.eventType === CheckInEventType.CHECK_OUT) {
        const checkInEvent = pendingCheckIns.get(key);
        if (checkInEvent) {
          const checkIn = new Date(checkInEvent.timestamp).getTime();
          const checkOut = new Date(ci.timestamp).getTime();
          const duration = Math.max(0, (checkOut - checkIn) / 60000);

          reports.push({
            workerId: ci.workerId,
            workerName: workerNames.get(ci.workerId) ?? 'Unknown',
            jobId: ci.jobId ?? '',
            jobTitle: '',
            geofenceId: ci.geofenceId,
            geofenceName: ci.geofence?.name ?? 'Unknown',
            checkInTime: checkInEvent.timestamp.toISOString(),
            checkOutTime: ci.timestamp.toISOString(),
            durationMinutes: duration,
          });
          pendingCheckIns.delete(key);
        }
      }
    }

    // Add unclosed check-ins
    for (const [, ci] of pendingCheckIns) {
      reports.push({
        workerId: ci.workerId,
        workerName: workerNames.get(ci.workerId) ?? 'Unknown',
        jobId: ci.jobId ?? '',
        jobTitle: '',
        geofenceId: ci.geofenceId,
        geofenceName: ci.geofence?.name ?? 'Unknown',
        checkInTime: ci.timestamp.toISOString(),
        checkOutTime: undefined,
        durationMinutes: undefined,
      });
    }

    return reports;
  }
}
