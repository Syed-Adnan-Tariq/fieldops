import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { JobEntity } from '../jobs/entities/job.entity';
import { LocationEntity } from '../tracking/entities/location.entity';
import { CheckInEntity } from '../geofencing/entities/checkin.entity';
import { UserEntity } from '../users/entities/user.entity';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobEntity, LocationEntity, CheckInEntity, UserEntity]),
    TrackingModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
