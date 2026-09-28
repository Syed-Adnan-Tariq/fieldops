import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UserRole, WorkerStatus, TransportMode } from '@fieldops/shared';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.WORKER,
  })
  role: UserRole;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Worker-specific fields
  @Column({
    type: 'enum',
    enum: WorkerStatus,
    default: WorkerStatus.OFFLINE,
    nullable: true,
  })
  status: WorkerStatus | null;

  @Column({
    type: 'enum',
    enum: TransportMode,
    default: TransportMode.VEHICLE,
    nullable: true,
  })
  transportMode: TransportMode | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  vehicleId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  currentLatitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  currentLongitude: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  refreshTokenHash: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
