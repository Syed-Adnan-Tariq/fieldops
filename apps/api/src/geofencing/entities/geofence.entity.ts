import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { GeofenceType } from '@fieldops/shared';

@Entity('geofences')
export class GeofenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: GeofenceType,
    default: GeofenceType.POLYGON,
  })
  type: GeofenceType;

  // For circles: store center + radius
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  centerLatitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  centerLongitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  radiusMeters: number | null;

  // For polygons: store as GeoJSON-like array of [lng, lat] coordinates
  @Column({ type: 'jsonb', nullable: true })
  polygonCoordinates: Array<{ latitude: number; longitude: number }> | null;

  // PostGIS geometry column for efficient spatial queries
  // Stored as WKT / GeoJSON - TypeORM doesn't natively handle geometry
  @Column({ type: 'text', nullable: true })
  geometryWkt: string | null;

  @Column({ type: 'uuid', nullable: true })
  jobId: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: true })
  triggerOnEnter: boolean;

  @Column({ type: 'boolean', default: true })
  triggerOnExit: boolean;

  @Column({ type: 'uuid' })
  createdById: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
