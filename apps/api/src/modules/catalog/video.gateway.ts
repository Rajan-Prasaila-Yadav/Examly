// apps/api/src/modules/catalog/video.gateway.ts
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
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/video',
})
export class VideoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VideoGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`🟢 Video socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔴 Video socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_video')
  handleJoinVideo(@ConnectedSocket() client: Socket, @MessageBody() data: { videoId: string }) {
    if (data?.videoId) {
      client.join(`video_${data.videoId}`);
      this.logger.log(`Client ${client.id} joined video room: video_${data.videoId}`);
    }
  }

  @SubscribeMessage('leave_video')
  handleLeaveVideo(@ConnectedSocket() client: Socket, @MessageBody() data: { videoId: string }) {
    if (data?.videoId) {
      client.leave(`video_${data.videoId}`);
    }
  }

  broadcastVideoReaction(videoId: string, payload: any) {
    if (this.server) {
      this.server.to(`video_${videoId}`).emit('video_reaction_updated', payload);
    }
  }

  broadcastCommentChange(videoId: string, action: 'CREATE' | 'UPDATE' | 'DELETE' | 'REACTION', payload: any) {
    if (this.server) {
      this.server.to(`video_${videoId}`).emit('video_comments_sync', { action, payload });
    }
  }
}
