import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/message.dto';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class MessagingGateway {
  @WebSocketServer() server: Server;

  constructor(private readonly messagingService: MessagingService) {}

  @SubscribeMessage('message:send')
  async handleMessage(
    @MessageBody() data: { senderId: string; dto: SendMessageDto },
    @ConnectedSocket() client: Socket,
  ) {
    const msg = await this.messagingService.send(data.senderId, data.dto);
    // Emit to recipient's room
    if (msg.recipientId) {
      this.server.to(`user:${msg.recipientId}`).emit('message:received', msg);
    }
    this.server.to(`user:${msg.senderId}`).emit('message:sent', msg);
    return msg;
  }
}
