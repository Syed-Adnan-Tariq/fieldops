import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('alert_rules')
export class AlertRuleEntity {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'varchar', length: 255 }) name: string;

  @Column({
    type: 'enum',
    enum: ['geofence_enter', 'geofence_exit', 'job_completed', 'job_overdue', 'worker_offline', 'idle_too_long'],
  })
  trigger: string;

  // Conditions as JSONB: { workerId?, geofenceId?, idleMinutes?, overdueMinutes? }
  @Column({ type: 'jsonb', default: {} }) conditions: Record<string, any>;

  // Actions: { email?: string[], webhook?: string }
  @Column({ type: 'jsonb', default: {} }) actions: Record<string, any>;

  @Column({ type: 'boolean', default: true }) isActive: boolean;

  @Column({ type: 'uuid' }) createdById: string;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy: UserEntity;

  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
