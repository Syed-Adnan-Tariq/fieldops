import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('locations')
@Index(['workerId', 'timestamp'])
export class LocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => UserEntity, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker: UserEntity;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  altitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  accuracy: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  speed: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  heading: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  batteryLevel: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  timestamp: Date;
}
