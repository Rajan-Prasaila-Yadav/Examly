// apps/api/src/modules/chat/chat.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { CurrentUser, CurrentUserPayload } from '../../platform/rbac/decorators/current-user.decorator';

@ApiTags('1-on-1 Doubt Solving & Messaging')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get active conversation list for current user' })
  async getConversations(@CurrentUser() user: CurrentUserPayload) {
    return this.chatService.getConversations(user.userId);
  }

  @Get('history/:targetUserId')
  @ApiOperation({ summary: 'Get 1-on-1 chat history with a specific teacher/student' })
  async getChatHistory(
    @CurrentUser() user: CurrentUserPayload,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.chatService.getChatHistory(user.userId, targetUserId);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send message / PDF with annotation / image' })
  async sendMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      receiverId: string;
      content?: string;
      imageUrl?: string;
      pdfUrl?: string;
      pdfAnnotationsJson?: string;
    },
  ) {
    return this.chatService.sendMessage(user.userId, body.receiverId, body);
  }

  @Post('read/:senderId')
  @ApiOperation({ summary: 'Mark messages as read' })
  async markAsRead(@CurrentUser() user: CurrentUserPayload, @Param('senderId') senderId: string) {
    return this.chatService.markAsRead(senderId, user.userId);
  }
}
