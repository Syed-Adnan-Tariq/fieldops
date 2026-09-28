import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('messages')
@Index(['senderId', 'recipientId'])
@Index(['createdAt'])
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  senderId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: UserEntity;

  @Column({ type: 'uuid', nullable: true, comment: 'null = broadcast to all admins' })
  recipientId: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'recipientId' })
  recipient: UserEntity | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'uuid', nullable: true })
  jobId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  locationLatitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  locationLongitude: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
