import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Or, IsNull } from 'typeorm';
import { MessageEntity } from './entities/message.entity';
import { SendMessageDto } from './dto/message.dto';

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly msgRepo: Repository<MessageEntity>,
  ) {}

  async send(senderId: string, dto: SendMessageDto): Promise<MessageEntity> {
    const msg = this.msgRepo.create({
      senderId,
      recipientId: dto.recipientId ?? null,
      content: dto.content,
      jobId: dto.jobId ?? null,
      locationLatitude: dto.locationLatitude ?? null,
      locationLongitude: dto.locationLongitude ?? null,
      isRead: false,
    });
    return this.msgRepo.save(msg);
  }

  async getConversation(userAId: string, userBId: string, page = 1, limit = 50): Promise<{ messages: MessageEntity[]; total: number }> {
    const skip = (page - 1) * limit;
    const [messages, total] = await this.msgRepo.findAndCount({
      where: [
        { senderId: userAId, recipientId: userBId },
        { senderId: userBId, recipientId: userAId },
      ],
      relations: ['sender', 'recipient'],
      order: { createdAt: 'DESC' },
      skip, take: limit,
    });
    return { messages: messages.reverse(), total };
  }

  async getInbox(userId: string, page = 1, limit = 50): Promise<{ messages: MessageEntity[]; total: number }> {
    const skip = (page - 1) * limit;
    const [messages, total] = await this.msgRepo.findAndCount({
      where: [
        { recipientId: userId },
        { senderId: userId },
      ],
      relations: ['sender', 'recipient'],
      order: { createdAt: 'DESC' },
      skip, take: limit,
    });
    return { messages, total };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.msgRepo.count({ where: { recipientId: userId, isRead: false } });
  }

  async markRead(userId: string, messageId: string): Promise<void> {
    await this.msgRepo.update({ id: messageId, recipientId: userId }, { isRead: true });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.msgRepo.update({ recipientId: userId, isRead: false }, { isRead: true });
  }

  async getThreads(userId: string): Promise<any[]> {
    // Get latest message per conversation partner
    const raw = await this.msgRepo.createQueryBuilder('m')
      .leftJoin('m.sender', 'sender')
      .leftJoin('m.recipient', 'recipient')
      .select([
        'CASE WHEN m.senderId = :uid THEN m.recipientId ELSE m.senderId END AS partnerId',
        'MAX(m.createdAt) AS lastAt',
        'SUM(CASE WHEN m.recipientId = :uid AND m.isRead = false THEN 1 ELSE 0 END) AS unread',
      ])
      .where('m.senderId = :uid OR m.recipientId = :uid', { uid: userId })
      .andWhere('m.recipientId IS NOT NULL')
      .groupBy('CASE WHEN m.senderId = :uid THEN m.recipientId ELSE m.senderId END')
      .setParameter('uid', userId)
      .getRawMany();
    return raw;
  }
}
