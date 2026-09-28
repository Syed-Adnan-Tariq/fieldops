import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JobsModule } from './jobs/jobs.module';
import { TrackingModule } from './tracking/tracking.module';
import { GeofencingModule } from './geofencing/geofencing.module';
import { RoutesModule } from './routes/routes.module';
import { ReportsModule } from './reports/reports.module';
import { TimeclockModule } from './timeclock/timeclock.module';
import { ActivityModule } from './activity/activity.module';
import { AlertsModule } from './alerts/alerts.module';
import { MessagingModule } from './messaging/messaging.module';
import { PlacesModule } from './places/places.module';
import { TeamsModule } from './teams/teams.module';
import { RecurringJobsModule } from './recurring-jobs/recurring-jobs.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    QueueModule,
    AuthModule,
    UsersModule,
    JobsModule,
    TrackingModule,
    GeofencingModule,
    RoutesModule,
    ReportsModule,
    TimeclockModule,
    ActivityModule,
    AlertsModule,
    MessagingModule,
    PlacesModule,
    TeamsModule,
    RecurringJobsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
