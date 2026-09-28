import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('alert_events')
export class AlertEventEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) ruleId: string;
  @Column({ type: 'varchar', length: 255 }) ruleName: string;
  @Column({ type: 'text' }) message: string;
  @Column({ type: 'uuid', nullable: true }) workerId: string | null;
  @Column({ type: 'uuid', nullable: true }) jobId: string | null;
  @Column({ type: 'jsonb', default: {} }) meta: Record<string, any>;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
