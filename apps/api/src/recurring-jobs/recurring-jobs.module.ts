import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecurringJobEntity } from './entities/recurring-job.entity';
import { JobEntity } from '../jobs/entities/job.entity';
import { RecurringJobsController } from './recurring-jobs.controller';
import { RecurringJobsService } from './recurring-jobs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecurringJobEntity, JobEntity]),
  ],
  controllers: [RecurringJobsController],
  providers: [RecurringJobsService],
  exports: [RecurringJobsService],
})
export class RecurringJobsModule {}
