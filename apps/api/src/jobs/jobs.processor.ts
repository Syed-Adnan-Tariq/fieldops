import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '@fieldops/shared';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { JobsService } from './jobs.service';

interface DispatchJobPayload {
  jobId: string;
  workerId: string;
}

@Processor(QUEUE_NAMES.JOB_DISPATCH)
export class JobsProcessor {
  private readonly logger = new Logger(JobsProcessor.name);

  constructor(
    private readonly trackingGateway: TrackingGateway,
  ) {}

  @Process('dispatch')
  async handleDispatch(job: Job<DispatchJobPayload>) {
    const { jobId, workerId } = job.data;
    this.logger.log(`Processing dispatch for job ${jobId} → worker ${workerId}`);

    try {
      // Emit socket event to the specific worker
      this.trackingGateway.notifyWorkerJobAssigned(workerId, jobId);
      this.logger.log(`Dispatched job ${jobId} to worker ${workerId} via socket`);
    } catch (error) {
      this.logger.error(`Failed to dispatch job ${jobId}`, (error as Error).stack);
      throw error;
    }
  }
}
