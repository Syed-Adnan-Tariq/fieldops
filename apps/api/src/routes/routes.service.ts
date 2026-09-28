import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { RouteEntity } from './entities/route.entity';
import { OptimizeRouteDto } from './dto/optimize-route.dto';
import { JobsService } from '../jobs/jobs.service';

interface MapboxOptimizationResponse {
  code: string;
  waypoints: Array<{
    waypoint_index: number;
    trips_index: number;
    name: string;
    location: [number, number];
  }>;
  trips: Array<{
    geometry: string;
    duration: number;
    distance: number;
    legs: Array<{
      duration: number;
      distance: number;
    }>;
  }>;
}

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);

  constructor(
    @InjectRepository(RouteEntity)
    private readonly routeRepository: Repository<RouteEntity>,
    private readonly configService: ConfigService,
    private readonly jobsService: JobsService,
  ) {}

  async optimizeRoute(dto: OptimizeRouteDto): Promise<RouteEntity> {
    const accessToken = this.configService.get<string>('MAPBOX_ACCESS_TOKEN');
    if (!accessToken) {
      throw new BadRequestException('Mapbox access token not configured');
    }

    // Fetch all jobs to get their coordinates
    const jobs = await Promise.all(
      dto.jobIds.map((id) => this.jobsService.findById(id)),
    );

    const jobsWithCoords = jobs.filter(
      (j) => j.addressLatitude !== null && j.addressLongitude !== null,
    );

    if (jobsWithCoords.length === 0) {
      throw new BadRequestException(
        'No jobs with valid coordinates found for route optimization',
      );
    }

    // Build coordinates string for Mapbox Optimization API
    // Format: lng,lat;lng,lat;...
    const startCoord = `${dto.startCoordinates.longitude},${dto.startCoordinates.latitude}`;
    const jobCoords = jobsWithCoords
      .map((j) => `${j.addressLongitude},${j.addressLatitude}`)
      .join(';');

    let coordsString = `${startCoord};${jobCoords}`;

    if (dto.endCoordinates) {
      coordsString += `;${dto.endCoordinates.longitude},${dto.endCoordinates.latitude}`;
    }

    let optimizedRoute: MapboxOptimizationResponse | null = null;
    let totalDistance = 0;
    let totalDuration = 0;
    let polyline: string | null = null;
    let orderedStops: typeof jobsWithCoords = jobsWithCoords;

    try {
      const url = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordsString}`;
      const response = await axios.get<MapboxOptimizationResponse>(url, {
        params: {
          access_token: accessToken,
          geometries: 'polyline',
          overview: 'full',
          roundtrip: dto.endCoordinates ? false : true,
        },
        timeout: 10000,
      });

      optimizedRoute = response.data;

      if (optimizedRoute.code === 'Ok' && optimizedRoute.trips.length > 0) {
        const trip = optimizedRoute.trips[0];
        totalDistance = trip.distance;
        totalDuration = trip.duration;
        polyline = trip.geometry;

        // Reorder jobs based on waypoint_index from Mapbox response
        // The first waypoint is the starting location (index 0)
        const waypointOrder = optimizedRoute.waypoints
          .filter((wp) => wp.waypoint_index > 0)
          .sort((a, b) => a.waypoint_index - b.waypoint_index);

        orderedStops = waypointOrder
          .map((wp) => {
            // wp.waypoint_index 1 = first job, etc.
            const jobIndex = wp.waypoint_index - 1;
            return jobsWithCoords[jobIndex];
          })
          .filter(Boolean);
      }
    } catch (error) {
      this.logger.warn(
        `Mapbox optimization failed, using original order: ${(error as Error).message}`,
      );
      // Fall through with original order
    }

    // Build stops array
    const stops = orderedStops.map((job, index) => ({
      jobId: job.id,
      order: index + 1,
      addressStreet: job.addressStreet,
      addressCity: job.addressCity,
      latitude: Number(job.addressLatitude),
      longitude: Number(job.addressLongitude),
      estimatedArrivalAt: undefined,
      estimatedDurationMinutes: job.estimatedDurationMinutes ?? undefined,
    }));

    const route = this.routeRepository.create({
      workerId: dto.workerId,
      stops,
      totalDistanceMeters: totalDistance,
      totalDurationSeconds: totalDuration,
      optimizedPolyline: polyline,
      mapboxRouteId: null,
    });

    return this.routeRepository.save(route);
  }

  async findAll(workerId?: string): Promise<RouteEntity[]> {
    const where = workerId ? { workerId } : {};
    return this.routeRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async findById(id: string): Promise<RouteEntity> {
    const route = await this.routeRepository.findOne({ where: { id } });
    if (!route) {
      throw new NotFoundException(`Route ${id} not found`);
    }
    return route;
  }

  async findWorkerLatestRoute(workerId: string): Promise<RouteEntity | null> {
    return this.routeRepository.findOne({
      where: { workerId },
      order: { createdAt: 'DESC' },
    });
  }
}
