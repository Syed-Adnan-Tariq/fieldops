import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CheckInEventType } from '@fieldops/shared';
import { UserEntity } from '../../users/entities/user.entity';
import { GeofenceEntity } from './geofence.entity';

@Entity('checkins')
@Index(['workerId', 'geofenceId', 'timestamp'])
export class CheckInEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => UserEntity, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker: UserEntity;

  @Index()
  @Column({ type: 'uuid' })
  geofenceId: string;

  @ManyToOne(() => GeofenceEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'geofenceId' })
  geofence: GeofenceEntity;

  @Column({ type: 'uuid', nullable: true })
  jobId: string | null;

  @Column({
    type: 'enum',
    enum: CheckInEventType,
  })
  eventType: CheckInEventType;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @CreateDateColumn({ type: 'timestamptz' })
  timestamp: Date;
}
