import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertRuleEntity } from './entities/alert-rule.entity';
import { AlertEventEntity } from './entities/alert-event.entity';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { JobEntity } from '../jobs/entities/job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AlertRuleEntity, AlertEventEntity, JobEntity])],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
