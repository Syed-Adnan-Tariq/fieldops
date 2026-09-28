import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { JobStatus } from '@fieldops/shared';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('jobs')
export class JobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.PENDING,
  })
  status: JobStatus;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  })
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Assigned worker
  @Index()
  @Column({ type: 'uuid', nullable: true })
  assignedWorkerId: string | null;

  @ManyToOne(() => UserEntity, { eager: false, nullable: true })
  @JoinColumn({ name: 'assignedWorkerId' })
  assignedWorker: UserEntity | null;

  // Created by admin
  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => UserEntity, { eager: false })
  @JoinColumn({ name: 'createdById' })
  createdBy: UserEntity;

  // Address fields
  @Column({ type: 'varchar', length: 300 })
  addressStreet: string;

  @Column({ type: 'varchar', length: 100 })
  addressCity: string;

  @Column({ type: 'varchar', length: 100 })
  addressState: string;

  @Column({ type: 'varchar', length: 20 })
  addressPostalCode: string;

  @Column({ type: 'varchar', length: 100, default: 'US' })
  addressCountry: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  addressLatitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  addressLongitude: number | null;

  // Scheduling
  @Column({ type: 'timestamptz', nullable: true })
  scheduledStartAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledEndAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  actualStartAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  actualEndAt: Date | null;

  @Column({ type: 'int', nullable: true })
  estimatedDurationMinutes: number | null;

  // Notes stored as JSONB array
  @Column({ type: 'jsonb', default: [] })
  notes: Array<{
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    createdAt: string;
  }>;

  // Attachments metadata stored as JSONB
  @Column({ type: 'jsonb', default: [] })
  attachments: Array<{
    id: string;
    filename: string;
    url: string;
    mimeType: string;
    size: number;
    uploadedBy: string;
    uploadedAt: string;
  }>;

  // Custom fields stored as JSONB array
  @Column({ type: 'jsonb', default: [], nullable: true })
  customFields: Array<{ key: string; value: string; type: 'text' | 'number' | 'checkbox' | 'date' }>;

  // Signature
  @Column({ type: 'jsonb', nullable: true })
  signature: {
    id: string;
    signerName: string;
    signatureDataUrl: string;
    capturedAt: string;
    capturedBy: string;
  } | null;

  @Column({ type: 'uuid', nullable: true })
  geofenceId: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
