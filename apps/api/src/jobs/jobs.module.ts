import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobsProcessor } from './jobs.processor';
import { JobEntity } from './entities/job.entity';
import { UsersModule } from '../users/users.module';
import { TrackingModule } from '../tracking/tracking.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AlertsModule } from '../alerts/alerts.module';
import { QUEUE_NAMES } from '@fieldops/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobEntity]),
    BullModule.registerQueue({ name: QUEUE_NAMES.JOB_DISPATCH }),
    UsersModule,
    forwardRef(() => TrackingModule),
    NotificationsModule,
    AlertsModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, JobsProcessor],
  exports: [JobsService, TypeOrmModule],
})
export class JobsModule {}
