import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserEntity } from '../users/entities/user.entity';
import { JobEntity } from '../jobs/entities/job.entity';
import { LocationEntity } from '../tracking/entities/location.entity';
import { GeofenceEntity } from '../geofencing/entities/geofence.entity';
import { CheckInEntity } from '../geofencing/entities/checkin.entity';
import { RouteEntity } from '../routes/entities/route.entity';
import { WorkShiftEntity } from '../timeclock/entities/work-shift.entity';
import { AlertRuleEntity } from '../alerts/entities/alert-rule.entity';
import { AlertEventEntity } from '../alerts/entities/alert-event.entity';
import { MessageEntity } from '../messaging/entities/message.entity';
import { PlaceEntity } from '../places/entities/place.entity';
import { TeamEntity } from '../teams/entities/team.entity';
import { RecurringJobEntity } from '../recurring-jobs/entities/recurring-job.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'fieldops'),
        password: config.get<string>('DB_PASSWORD', 'fieldops_secret'),
        database: config.get<string>('DB_NAME', 'fieldops_db'),
        ssl: config.get<string>('DB_SSL', 'false') === 'true'
          ? { rejectUnauthorized: false }
          : false,
        entities: [
          UserEntity,
          JobEntity,
          LocationEntity,
          GeofenceEntity,
          CheckInEntity,
          RouteEntity,
          WorkShiftEntity,
          AlertRuleEntity,
          AlertEventEntity,
          MessageEntity,
          PlaceEntity,
          TeamEntity,
          RecurringJobEntity,
        ],
        synchronize: true,
        logging: config.get<string>('NODE_ENV', 'development') === 'development',
        migrations: ['dist/migrations/*.js'],
        migrationsRun: true,
        extra: {
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
