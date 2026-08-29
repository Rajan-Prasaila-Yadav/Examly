// apps/api/src/modules/chat/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private onlineUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_ACCESS_SECRET') || 'examly_jwt_access_super_secret_key_2026_production_abcdef';
      const payload = this.jwtService.verify(token, { secret });
      const userId = payload.sub;

      client.data.userId = userId;
      this.onlineUsers.set(userId, client.id);

      // Broadcast user online status
      this.server.emit('user_status_changed', { userId, isOnline: true });
      this.logger.log(`🟢 User connected: ${userId} (${client.id})`);
    } catch (err) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.onlineUsers.delete(userId);
      this.server.emit('user_status_changed', { userId, isOnline: false });
      this.logger.log(`🔴 User disconnected: ${userId}`);
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      receiverId: string;
      content?: string;
      imageUrl?: string;
      pdfUrl?: string;
      pdfAnnotationsJson?: string;
    },
  ) {
    const senderId = client.data.userId;
    const message = await this.chatService.sendMessage(senderId, data.receiverId, data);

    // Emit to receiver if online
    const receiverSocketId = this.onlineUsers.get(data.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('new_message', message);
    }

    // Acknowledge back to sender
    return message;
  }
}
