import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';
import { LocationEntity } from './entities/location.entity';
import { UsersModule } from '../users/users.module';
import { GeofencingModule } from '../geofencing/geofencing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LocationEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'fallback_secret'),
      }),
    }),
    UsersModule,
    forwardRef(() => GeofencingModule),
  ],
  controllers: [TrackingController],
  providers: [TrackingGateway, TrackingService],
  exports: [TrackingGateway, TrackingService, TypeOrmModule],
})
export class TrackingModule {}
