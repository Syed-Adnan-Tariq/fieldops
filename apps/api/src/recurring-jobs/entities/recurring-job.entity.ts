import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('recurring_jobs')
export class RecurringJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' })
  priority: string;

  // Address
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

  // Recurrence
  @Column({ type: 'enum', enum: ['daily', 'weekly', 'biweekly', 'monthly'] })
  frequency: string;

  @Column({ type: 'int', default: 1 })
  intervalValue: number;

  @Column({ type: 'timestamptz' })
  startDate: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endDate: Date | null;

  @Column({ type: 'int', nullable: true })
  estimatedDurationMinutes: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  nextRunAt: Date | null;

  // Optional worker assignment
  @Column({ type: 'uuid', nullable: true })
  assignedWorkerId: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy: UserEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
