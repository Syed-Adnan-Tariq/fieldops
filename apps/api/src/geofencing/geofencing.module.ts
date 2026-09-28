import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeofencingService } from './geofencing.service';
import { GeofencingController } from './geofencing.controller';
import { GeofenceEntity } from './entities/geofence.entity';
import { CheckInEntity } from './entities/checkin.entity';
import { TrackingModule } from '../tracking/tracking.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GeofenceEntity, CheckInEntity]),
    forwardRef(() => TrackingModule),
    AlertsModule,
  ],
  controllers: [GeofencingController],
  providers: [GeofencingService],
  exports: [GeofencingService, TypeOrmModule],
})
export class GeofencingModule {}
