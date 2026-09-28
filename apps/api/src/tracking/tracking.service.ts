import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LocationEntity } from './entities/location.entity';
import { UsersService } from '../users/users.service';
import { LocationUpdateDto } from './dto/location-update.dto';
import { GeofencingService } from '../geofencing/geofencing.service';

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    @InjectRepository(LocationEntity)
    private readonly locationRepository: Repository<LocationEntity>,
    private readonly usersService: UsersService,
    private readonly geofencingService: GeofencingService,
  ) {}

  async recordLocation(
    workerId: string,
    dto: LocationUpdateDto,
  ): Promise<LocationEntity> {
    const location = this.locationRepository.create({
      workerId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      altitude: dto.altitude ?? null,
      accuracy: dto.accuracy ?? null,
      speed: dto.speed ?? null,
      heading: dto.heading ?? null,
      batteryLevel: dto.batteryLevel ?? null,
    });

    const saved = await this.locationRepository.save(location);

    // Update worker's current location in users table
    await this.usersService.updateLocation(workerId, dto.latitude, dto.longitude);

    // Check geofence triggers asynchronously
    this.geofencingService
      .checkGeofencesForWorker(workerId, dto.latitude, dto.longitude)
      .catch((err: Error) =>
        this.logger.error('Geofence check failed', err.stack),
      );

    return saved;
  }

  async getWorkerHistory(
    workerId: string,
    startDate: Date,
    endDate: Date,
    limit = 1000,
  ): Promise<LocationEntity[]> {
    return this.locationRepository.find({
      where: {
        workerId,
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'ASC' },
      take: limit,
    });
  }

  async getLatestLocations(): Promise<LocationEntity[]> {
    // Get the latest location for each worker using a subquery
    return this.locationRepository
      .createQueryBuilder('loc')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('MAX(sub.timestamp)', 'maxTs')
          .addSelect('sub.workerId', 'wid')
          .from(LocationEntity, 'sub')
          .groupBy('sub.workerId')
          .getQuery();
        return `(loc.workerId, loc.timestamp) IN (${subQuery})`;
      })
      .leftJoinAndSelect('loc.worker', 'worker')
      .orderBy('loc.timestamp', 'DESC')
      .getMany();
  }

  async getWorkerLocationAt(
    workerId: string,
    timestamp: Date,
  ): Promise<LocationEntity | null> {
    return this.locationRepository
      .createQueryBuilder('loc')
      .where('loc.workerId = :workerId', { workerId })
      .andWhere('loc.timestamp <= :timestamp', { timestamp })
      .orderBy('loc.timestamp', 'DESC')
      .limit(1)
      .getOne();
  }

  async calculateDistance(locations: LocationEntity[]): Promise<number> {
    if (locations.length < 2) return 0;

    let totalMeters = 0;
    for (let i = 1; i < locations.length; i++) {
      totalMeters += this.haversineDistance(
        Number(locations[i - 1].latitude),
        Number(locations[i - 1].longitude),
        Number(locations[i].latitude),
        Number(locations[i].longitude),
      );
    }
    return totalMeters;
  }

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
