import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('routes')
export class RouteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  workerId: string;

  @Column({ type: 'jsonb' })
  stops: Array<{
    jobId: string;
    order: number;
    addressStreet: string;
    addressCity: string;
    latitude: number;
    longitude: number;
    estimatedArrivalAt?: string;
    estimatedDurationMinutes?: number;
  }>;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalDistanceMeters: number;

  @Column({ type: 'int', default: 0 })
  totalDurationSeconds: number;

  @Column({ type: 'text', nullable: true })
  optimizedPolyline: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mapboxRouteId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
