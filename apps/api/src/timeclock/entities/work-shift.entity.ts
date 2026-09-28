import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('work_shifts')
@Index(['workerId', 'clockInAt'])
export class WorkShiftEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker: UserEntity;

  @Column({ type: 'timestamptz' })
  clockInAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  clockOutAt: Date | null;

  @Column({ type: 'int', nullable: true, comment: 'Duration in minutes' })
  durationMinutes: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  clockInLatitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  clockInLongitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  clockOutLatitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  clockOutLongitude: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
