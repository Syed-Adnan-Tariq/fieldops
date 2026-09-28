import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull, Or } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { RecurringJobEntity } from './entities/recurring-job.entity';
import { JobEntity } from '../jobs/entities/job.entity';
import { JobStatus } from '@fieldops/shared';

export class CreateRecurringJobDto {
  title: string;
  description?: string;
  priority: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressPostalCode: string;
  addressCountry?: string;
  frequency: string;
  intervalValue?: number;
  startDate: string;
  endDate?: string;
  estimatedDurationMinutes?: number;
  assignedWorkerId?: string;
}

export class UpdateRecurringJobDto {
  title?: string;
  description?: string;
  priority?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressPostalCode?: string;
  addressCountry?: string;
  frequency?: string;
  intervalValue?: number;
  startDate?: string;
  endDate?: string;
  estimatedDurationMinutes?: number;
  assignedWorkerId?: string;
  isActive?: boolean;
}

@Injectable()
export class RecurringJobsService {
  private readonly logger = new Logger(RecurringJobsService.name);

  constructor(
    @InjectRepository(RecurringJobEntity)
    private readonly recurringJobRepo: Repository<RecurringJobEntity>,
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
  ) {}

  async create(dto: CreateRecurringJobDto, userId: string): Promise<RecurringJobEntity> {
    const startDate = new Date(dto.startDate);
    const entity = this.recurringJobRepo.create({
      title: dto.title,
      description: dto.description ?? null,
      priority: dto.priority,
      addressStreet: dto.addressStreet,
      addressCity: dto.addressCity,
      addressState: dto.addressState,
      addressPostalCode: dto.addressPostalCode,
      addressCountry: dto.addressCountry ?? 'US',
      frequency: dto.frequency,
      intervalValue: dto.intervalValue ?? 1,
      startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      estimatedDurationMinutes: dto.estimatedDurationMinutes ?? null,
      nextRunAt: startDate,
      assignedWorkerId: dto.assignedWorkerId ?? null,
      isActive: true,
      createdById: userId,
    });
    return this.recurringJobRepo.save(entity);
  }

  async findAll(): Promise<RecurringJobEntity[]> {
    return this.recurringJobRepo.find({
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<RecurringJobEntity> {
    const job = await this.recurringJobRepo.findOne({
      where: { id },
      relations: ['createdBy'],
    });
    if (!job) throw new NotFoundException(`Recurring job ${id} not found`);
    return job;
  }

  async update(id: string, dto: UpdateRecurringJobDto): Promise<RecurringJobEntity> {
    const job = await this.findById(id);
    if (dto.title !== undefined) job.title = dto.title;
    if (dto.description !== undefined) job.description = dto.description ?? null;
    if (dto.priority !== undefined) job.priority = dto.priority;
    if (dto.addressStreet !== undefined) job.addressStreet = dto.addressStreet;
    if (dto.addressCity !== undefined) job.addressCity = dto.addressCity;
    if (dto.addressState !== undefined) job.addressState = dto.addressState;
    if (dto.addressPostalCode !== undefined) job.addressPostalCode = dto.addressPostalCode;
    if (dto.addressCountry !== undefined) job.addressCountry = dto.addressCountry;
    if (dto.frequency !== undefined) job.frequency = dto.frequency;
    if (dto.intervalValue !== undefined) job.intervalValue = dto.intervalValue;
    if (dto.startDate !== undefined) job.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) job.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.estimatedDurationMinutes !== undefined) job.estimatedDurationMinutes = dto.estimatedDurationMinutes ?? null;
    if (dto.assignedWorkerId !== undefined) job.assignedWorkerId = dto.assignedWorkerId ?? null;
    if (dto.isActive !== undefined) job.isActive = dto.isActive;
    return this.recurringJobRepo.save(job);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.recurringJobRepo.delete(id);
  }

  async toggleActive(id: string): Promise<RecurringJobEntity> {
    const job = await this.findById(id);
    job.isActive = !job.isActive;
    return this.recurringJobRepo.save(job);
  }

  computeNextRun(job: RecurringJobEntity): Date {
    const base = job.nextRunAt ? new Date(job.nextRunAt) : new Date(job.startDate);
    const next = new Date(base);

    switch (job.frequency) {
      case 'daily':
        next.setDate(next.getDate() + job.intervalValue);
        break;
      case 'weekly':
        next.setDate(next.getDate() + job.intervalValue * 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      default:
        next.setDate(next.getDate() + job.intervalValue);
    }

    return next;
  }

  @Cron('0 * * * *')
  async processRecurringJobs(): Promise<void> {
    const now = new Date();

    const dueJobs = await this.recurringJobRepo
      .createQueryBuilder('rj')
      .where('rj.isActive = true')
      .andWhere('rj.nextRunAt <= :now', { now })
      .andWhere('(rj.endDate IS NULL OR rj.nextRunAt <= rj.endDate)')
      .getMany();

    for (const recurringJob of dueJobs) {
      try {
        const newJob = this.jobRepo.create({
          title: recurringJob.title,
          description: recurringJob.description,
          priority: recurringJob.priority as 'low' | 'medium' | 'high' | 'urgent',
          addressStreet: recurringJob.addressStreet,
          addressCity: recurringJob.addressCity,
          addressState: recurringJob.addressState,
          addressPostalCode: recurringJob.addressPostalCode,
          addressCountry: recurringJob.addressCountry,
          assignedWorkerId: recurringJob.assignedWorkerId,
          estimatedDurationMinutes: recurringJob.estimatedDurationMinutes,
          status: JobStatus.PENDING,
          createdById: recurringJob.createdById,
          notes: [],
          attachments: [],
          customFields: [],
          signature: null,
          tags: [],
          geofenceId: null,
          addressLatitude: null,
          addressLongitude: null,
          scheduledStartAt: null,
          scheduledEndAt: null,
          actualStartAt: null,
          actualEndAt: null,
        });

        await this.jobRepo.save(newJob);
        this.logger.log(
          `Created job "${recurringJob.title}" from recurring job ${recurringJob.id}`,
        );

        recurringJob.nextRunAt = this.computeNextRun(recurringJob);
        await this.recurringJobRepo.save(recurringJob);
      } catch (err) {
        this.logger.error(
          `Failed to process recurring job ${recurringJob.id}: ${(err as Error).message}`,
        );
      }
    }
  }
}
