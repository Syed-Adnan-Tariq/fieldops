import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { JobEntity } from './entities/job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import {
  UpdateJobDto,
  UpdateJobStatusDto,
  AssignJobDto,
  AddJobNoteDto,
  AddJobSignatureDto,
} from './dto/update-job.dto';
import { UsersService } from '../users/users.service';
import { JobStatus, QUEUE_NAMES, JOB_STATUS_TRANSITIONS } from '@fieldops/shared';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    @InjectQueue(QUEUE_NAMES.JOB_DISPATCH)
    private readonly jobDispatchQueue: Queue,
    private readonly usersService: UsersService,
    private readonly trackingGateway: TrackingGateway,
    private readonly notificationsService: NotificationsService,
    private readonly alertsService: AlertsService,
  ) {}

  async create(dto: CreateJobDto, createdById: string): Promise<JobEntity> {
    const job = this.jobRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      priority: dto.priority ?? 'medium',
      assignedWorkerId: dto.assignedWorkerId ?? null,
      createdById,
      addressStreet: dto.address.street,
      addressCity: dto.address.city,
      addressState: dto.address.state,
      addressPostalCode: dto.address.postalCode,
      addressCountry: dto.address.country ?? 'US',
      addressLatitude: dto.address.latitude ?? null,
      addressLongitude: dto.address.longitude ?? null,
      scheduledStartAt: dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : null,
      scheduledEndAt: dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : null,
      estimatedDurationMinutes: dto.estimatedDurationMinutes ?? null,
      geofenceId: dto.geofenceId ?? null,
      tags: dto.tags ?? [],
      notes: [],
      attachments: [],
      signature: null,
      status: dto.assignedWorkerId ? JobStatus.ASSIGNED : JobStatus.PENDING,
    });

    const saved = await this.jobRepository.save(job);

    // Queue dispatch notification if worker assigned
    if (dto.assignedWorkerId) {
      await this.jobDispatchQueue.add('dispatch', {
        jobId: saved.id,
        workerId: dto.assignedWorkerId,
      });
    }

    return saved;
  }

  async findAll(options?: {
    status?: JobStatus;
    workerId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ jobs: JobEntity[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = Math.min(options?.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: FindManyOptions<JobEntity>['where'] = {};
    if (options?.status) {
      (where as Record<string, unknown>).status = options.status;
    }
    if (options?.workerId) {
      (where as Record<string, unknown>).assignedWorkerId = options.workerId;
    }

    const [jobs, total] = await this.jobRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
      relations: ['assignedWorker'],
    });

    return { jobs, total };
  }

  async findById(id: string): Promise<JobEntity> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['assignedWorker', 'createdBy'],
    });
    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }
    return job;
  }

  async update(id: string, dto: UpdateJobDto): Promise<JobEntity> {
    const job = await this.findById(id);

    if (dto.address) {
      job.addressStreet = dto.address.street ?? job.addressStreet;
      job.addressCity = dto.address.city ?? job.addressCity;
      job.addressState = dto.address.state ?? job.addressState;
      job.addressPostalCode = dto.address.postalCode ?? job.addressPostalCode;
      job.addressCountry = dto.address.country ?? job.addressCountry;
      job.addressLatitude = dto.address.latitude ?? job.addressLatitude;
      job.addressLongitude = dto.address.longitude ?? job.addressLongitude;
    }

    if (dto.title !== undefined) job.title = dto.title;
    if (dto.description !== undefined) job.description = dto.description ?? null;
    if (dto.priority !== undefined) job.priority = dto.priority;
    if (dto.scheduledStartAt !== undefined)
      job.scheduledStartAt = dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : null;
    if (dto.scheduledEndAt !== undefined)
      job.scheduledEndAt = dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : null;
    if (dto.estimatedDurationMinutes !== undefined)
      job.estimatedDurationMinutes = dto.estimatedDurationMinutes ?? null;
    if (dto.tags !== undefined) job.tags = dto.tags ?? [];
    if (dto.geofenceId !== undefined) job.geofenceId = dto.geofenceId ?? null;
    if (dto.customFields !== undefined) job.customFields = dto.customFields ?? [];

    return this.jobRepository.save(job);
  }

  async updateStatus(
    id: string,
    dto: UpdateJobStatusDto,
    updatedById: string,
  ): Promise<JobEntity> {
    const job = await this.findById(id);
    const allowedTransitions = JOB_STATUS_TRANSITIONS[job.status] ?? [];

    if (!allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${job.status} to ${dto.status}`,
      );
    }

    const now = new Date();

    if (dto.status === JobStatus.IN_PROGRESS && !job.actualStartAt) {
      job.actualStartAt = now;
    }

    if (
      (dto.status === JobStatus.COMPLETED || dto.status === JobStatus.FAILED) &&
      !job.actualEndAt
    ) {
      job.actualEndAt = now;
    }

    job.status = dto.status;

    if (dto.note) {
      const user = await this.usersService.findById(updatedById);
      job.notes = [
        ...job.notes,
        {
          id: uuidv4(),
          authorId: updatedById,
          authorName: user ? `${user.firstName} ${user.lastName}` : 'System',
          content: dto.note,
          createdAt: now.toISOString(),
        },
      ];
    }

    const saved = await this.jobRepository.save(job);

    // Notify via socket
    this.trackingGateway.emitJobUpdated(saved);

    // Send completion email notification + fire alerts
    if (dto.status === JobStatus.COMPLETED && saved.assignedWorkerId) {
      const worker = await this.usersService.findById(saved.assignedWorkerId);
      const createdBy = await this.usersService.findById(saved.createdById);
      if (worker && createdBy?.email) {
        await this.notificationsService.sendJobCompleted({
          adminEmail: createdBy.email,
          workerName: `${worker.firstName} ${worker.lastName}`,
          jobTitle: saved.title,
          jobAddress: `${saved.addressStreet}, ${saved.addressCity}`,
          completedAt: saved.actualEndAt?.toISOString() ?? now.toISOString(),
          jobId: saved.id,
          signerName: saved.signature?.signerName,
        }).catch(() => {});

        // Fire job_completed alert rules
        this.alertsService.checkJobCompleted(
          saved.assignedWorkerId,
          saved.id,
          saved.title,
          `${worker.firstName} ${worker.lastName}`,
        ).catch(() => {});
      }
    }

    return saved;
  }

  async assign(id: string, dto: AssignJobDto): Promise<JobEntity> {
    const job = await this.findById(id);
    const worker = await this.usersService.findById(dto.workerId);
    if (!worker) {
      throw new NotFoundException(`Worker ${dto.workerId} not found`);
    }

    job.assignedWorkerId = dto.workerId;
    job.status = JobStatus.ASSIGNED;

    const saved = await this.jobRepository.save(job);

    // Queue dispatch
    await this.jobDispatchQueue.add('dispatch', {
      jobId: saved.id,
      workerId: dto.workerId,
    });

    // Send email notification
    if (worker?.email) {
      await this.notificationsService.sendJobAssigned({
        workerEmail: worker.email,
        workerName: `${worker.firstName} ${worker.lastName}`,
        jobTitle: saved.title,
        jobAddress: `${saved.addressStreet}, ${saved.addressCity}`,
        scheduledStart: saved.scheduledStartAt?.toISOString(),
        jobId: saved.id,
      }).catch(() => {});
    }

    return saved;
  }

  async dispatch(id: string): Promise<JobEntity> {
    const job = await this.findById(id);
    if (!job.assignedWorkerId) {
      throw new BadRequestException('Cannot dispatch job without assigned worker');
    }

    if (job.status !== JobStatus.ASSIGNED) {
      throw new BadRequestException('Job must be in ASSIGNED status to dispatch');
    }

    job.status = JobStatus.DISPATCHED;
    const saved = await this.jobRepository.save(job);

    // Emit to worker via socket
    this.trackingGateway.emitJobAssigned(job.assignedWorkerId, saved);

    // Send email notification
    const worker = await this.usersService.findById(saved.assignedWorkerId!);
    if (worker?.email) {
      await this.notificationsService.sendJobDispatched({
        workerEmail: worker.email,
        workerName: `${worker.firstName} ${worker.lastName}`,
        jobTitle: saved.title,
        jobAddress: `${saved.addressStreet}, ${saved.addressCity}`,
        jobId: saved.id,
      }).catch(() => {});
    }

    return saved;
  }

  async addNote(id: string, dto: AddJobNoteDto, authorId: string): Promise<JobEntity> {
    const job = await this.findById(id);
    const user = await this.usersService.findById(authorId);

    job.notes = [
      ...job.notes,
      {
        id: uuidv4(),
        authorId,
        authorName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        content: dto.content,
        createdAt: new Date().toISOString(),
      },
    ];

    return this.jobRepository.save(job);
  }

  async addSignature(
    id: string,
    dto: AddJobSignatureDto,
    capturedBy: string,
  ): Promise<JobEntity> {
    const job = await this.findById(id);

    job.signature = {
      id: uuidv4(),
      signerName: dto.signerName,
      signatureDataUrl: dto.signatureDataUrl,
      capturedAt: new Date().toISOString(),
      capturedBy,
    };

    return this.jobRepository.save(job);
  }

  async remove(id: string): Promise<void> {
    const job = await this.findById(id);
    job.status = JobStatus.CANCELLED;
    await this.jobRepository.save(job);
  }

  async getWorkerJobs(workerId: string): Promise<JobEntity[]> {
    return this.jobRepository.find({
      where: { assignedWorkerId: workerId },
      order: { scheduledStartAt: 'ASC', createdAt: 'DESC' },
    });
  }

  async importFromCSV(csvContent: string, createdById: string): Promise<{
    imported: number; failed: number; errors: string[];
  }> {
    const lines = csvContent.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) throw new BadRequestException('CSV must have a header row and at least one data row');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const results = { imported: 0, failed: 0, errors: [] as string[] };

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx]?.trim().replace(/^"|"$/g, '') ?? ''; });

        if (!row['title'] && !row['job title']) {
          results.failed++;
          results.errors.push(`Row ${i}: missing title`);
          continue;
        }

        await this.create({
          title: row['title'] || row['job title'],
          description: row['description'] || row['notes'] || undefined,
          priority: (row['priority'] as any) || 'medium',
          address: {
            street: row['street'] || row['address'] || '',
            city: row['city'] || '',
            state: row['state'] || '',
            postalCode: row['postal code'] || row['zip'] || row['postcode'] || '',
            country: row['country'] || 'US',
            latitude: row['latitude'] ? parseFloat(row['latitude']) : undefined,
            longitude: row['longitude'] ? parseFloat(row['longitude']) : undefined,
          },
          scheduledStartAt: row['scheduled start'] || row['start time'] || undefined,
          tags: row['tags'] ? row['tags'].split(';').map(t => t.trim()) : [],
        }, createdById);

        results.imported++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`Row ${i}: ${e.message}`);
      }
    }

    return results;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        result.push(current); current = '';
      } else {
        current += line[i];
      }
    }
    result.push(current);
    return result;
  }

  async autoDispatch(jobId: string): Promise<JobEntity> {
    const job = await this.findById(jobId);
    if (!job.addressLatitude || !job.addressLongitude) {
      throw new BadRequestException('Job must have coordinates for auto-dispatch');
    }

    const workers = await this.usersService.findActiveWorkers();
    if (!workers.length) throw new BadRequestException('No available workers found');

    // Filter workers that have location data
    const workersWithLocation = workers.filter(w => w.currentLatitude && w.currentLongitude);
    if (!workersWithLocation.length) throw new BadRequestException('No workers with known location');

    // Find closest worker using Haversine
    const jobLat = Number(job.addressLatitude);
    const jobLng = Number(job.addressLongitude);

    const closest = workersWithLocation.reduce((best, w) => {
      const wLat = Number(w.currentLatitude);
      const wLng = Number(w.currentLongitude);
      const dlat = (wLat - jobLat) * Math.PI / 180;
      const dlng = (wLng - jobLng) * Math.PI / 180;
      const a = Math.sin(dlat/2)**2 + Math.cos(jobLat*Math.PI/180) * Math.cos(wLat*Math.PI/180) * Math.sin(dlng/2)**2;
      const dist = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      if (!best || dist < best.dist) return { worker: w, dist };
      return best;
    }, null as { worker: any; dist: number } | null);

    if (!closest) throw new BadRequestException('Could not calculate distances');

    // Assign and dispatch
    return this.assign(jobId, { workerId: closest.worker.id });
  }

  async addPhoto(jobId: string, attachment: {
    id: string; filename: string; originalName: string;
    mimeType: string; size: number; url: string;
    uploadedAt: string; uploadedBy: string;
  }): Promise<JobEntity> {
    const job = await this.findById(jobId);
    const attachments = Array.isArray(job.attachments) ? job.attachments : [];
    attachments.push(attachment);
    await this.jobRepository.update(jobId, { attachments });
    return this.findById(jobId);
  }
}
