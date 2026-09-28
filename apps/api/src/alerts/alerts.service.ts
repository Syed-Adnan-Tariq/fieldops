import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertRuleEntity } from './entities/alert-rule.entity';
import { AlertEventEntity } from './entities/alert-event.entity';
import { JobEntity } from '../jobs/entities/job.entity';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from './dto/alert.dto';
import { JobStatus } from '@fieldops/shared';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(AlertRuleEntity)
    private readonly ruleRepo: Repository<AlertRuleEntity>,
    @InjectRepository(AlertEventEntity)
    private readonly eventRepo: Repository<AlertEventEntity>,
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
  ) {}

  createRule(dto: CreateAlertRuleDto, createdById: string) {
    const rule = this.ruleRepo.create({ ...dto, conditions: dto.conditions ?? {}, actions: dto.actions ?? {}, createdById });
    return this.ruleRepo.save(rule);
  }

  getRules() { return this.ruleRepo.find({ order: { createdAt: 'DESC' } }); }

  async updateRule(id: string, dto: UpdateAlertRuleDto) {
    await this.ruleRepo.update(id, dto);
    return this.ruleRepo.findOneBy({ id });
  }

  async deleteRule(id: string) { await this.ruleRepo.delete(id); }

  getEvents(opts?: { ruleId?: string; workerId?: string; limit?: number }) {
    return this.eventRepo.find({
      where: opts?.ruleId ? { ruleId: opts.ruleId } : opts?.workerId ? { workerId: opts.workerId } : {},
      order: { createdAt: 'DESC' },
      take: opts?.limit ?? 100,
    });
  }

  async fireAlert(ruleId: string, ruleName: string, message: string, meta: { workerId?: string; jobId?: string; [k: string]: any }) {
    const event = this.eventRepo.create({
      ruleId, ruleName, message,
      workerId: meta.workerId ?? null,
      jobId: meta.jobId ?? null,
      meta,
    });
    await this.eventRepo.save(event);
    this.logger.log(`Alert fired: [${ruleName}] ${message}`);
    // Email delivery is handled by NotificationsService if wired in
  }

  // Triggered externally (from geofencing service, jobs service, etc.)
  async checkGeofenceEvent(type: 'enter' | 'exit', workerId: string, geofenceId: string, workerName: string, geofenceName: string) {
    const trigger = type === 'enter' ? 'geofence_enter' : 'geofence_exit';
    const rules = await this.ruleRepo.find({ where: { trigger, isActive: true } });
    for (const rule of rules) {
      const c = rule.conditions;
      if (c.geofenceId && c.geofenceId !== geofenceId) continue;
      if (c.workerId && c.workerId !== workerId) continue;
      await this.fireAlert(rule.id, rule.name,
        `${workerName} ${type === 'enter' ? 'entered' : 'left'} ${geofenceName}`,
        { workerId, geofenceId, type });
    }
  }

  async checkJobCompleted(workerId: string, jobId: string, jobTitle: string, workerName: string) {
    const rules = await this.ruleRepo.find({ where: { trigger: 'job_completed', isActive: true } });
    for (const rule of rules) {
      const c = rule.conditions;
      if (c.workerId && c.workerId !== workerId) continue;
      await this.fireAlert(rule.id, rule.name, `${workerName} completed job: ${jobTitle}`, { workerId, jobId });
    }
  }

  // Cron: check for overdue jobs every 10 minutes
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkOverdueJobs() {
    try {
      const rules = await this.ruleRepo.find({ where: { trigger: 'job_overdue', isActive: true } });
      if (!rules.length) return;

      const now = new Date();
      // Find jobs that are scheduled to have started but are still pending/assigned/dispatched
      const overdueJobs = await this.jobRepo.find({
        where: [
          { status: JobStatus.PENDING, scheduledStartAt: LessThan(now) },
          { status: JobStatus.ASSIGNED, scheduledStartAt: LessThan(now) },
          { status: JobStatus.DISPATCHED, scheduledStartAt: LessThan(now) },
        ],
        relations: ['assignedWorker'],
        take: 100,
      });

      for (const job of overdueJobs) {
        for (const rule of rules) {
          const c = rule.conditions;
          const overdueMinutes = c.overdueMinutes ?? 0;
          if (!job.scheduledStartAt) continue;
          const minutesLate = (now.getTime() - job.scheduledStartAt.getTime()) / 60000;
          if (minutesLate < overdueMinutes) continue;
          if (c.workerId && c.workerId !== job.assignedWorkerId) continue;
          // Avoid duplicate alerts within 10 min window
          const recentEvent = await this.eventRepo.findOne({
            where: { ruleId: rule.id, jobId: job.id },
            order: { createdAt: 'DESC' },
          });
          if (recentEvent) {
            const minutesSinceLast = (now.getTime() - recentEvent.createdAt.getTime()) / 60000;
            if (minutesSinceLast < 10) continue;
          }
          const workerName = job.assignedWorker
            ? `${job.assignedWorker.firstName} ${job.assignedWorker.lastName}`
            : 'Unassigned';
          await this.fireAlert(rule.id, rule.name,
            `Job "${job.title}" is overdue by ${Math.round(minutesLate)} minutes (worker: ${workerName})`,
            { jobId: job.id, workerId: job.assignedWorkerId ?? undefined },
          );
        }
      }
    } catch (e: any) {
      this.logger.error('Overdue check failed:', e.message);
    }
  }
}
