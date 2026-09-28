import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('Messaging')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('messages')
export class MessagingController {
  constructor(private readonly svc: MessagingService) {}

  @Post()
  @ApiOperation({ summary: 'Send a message' })
  send(@Body() dto: SendMessageDto, @CurrentUser() user: CurrentUserData) {
    return this.svc.send(user.id, dto);
  }

  @Get('inbox')
  @ApiOperation({ summary: 'Get my inbox' })
  inbox(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.svc.getInbox(user.id, page, limit);
  }

  @Get('threads')
  @ApiOperation({ summary: 'Get conversation threads' })
  threads(@CurrentUser() user: CurrentUserData) {
    return this.svc.getThreads(user.id);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread count' })
  unread(@CurrentUser() user: CurrentUserData) {
    return this.svc.getUnreadCount(user.id).then(count => ({ count }));
  }

  @Get('conversation/:partnerId')
  @ApiOperation({ summary: 'Get conversation with a specific user' })
  conversation(
    @CurrentUser() user: CurrentUserData,
    @Param('partnerId', ParseUUIDPipe) partnerId: string,
    @Query('page') page?: number,
  ) {
    return this.svc.getConversation(user.id, partnerId, page);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark message as read' })
  markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserData) {
    return this.svc.markRead(user.id, id).then(() => ({ ok: true }));
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all messages as read' })
  markAllRead(@CurrentUser() user: CurrentUserData) {
    return this.svc.markAllRead(user.id).then(() => ({ ok: true }));
  }
}
