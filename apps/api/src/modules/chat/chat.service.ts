// apps/api/src/modules/chat/chat.service.ts
import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { RoleType } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getChatHistory(currentUserId: string, targetUserId: string) {
    return this.prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: currentUserId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getConversations(userId: string) {
    // Find all users who have exchanged messages with this user
    const messages = await this.prisma.chatMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true, role: { select: { code: true } } } },
        receiver: { select: { id: true, fullName: true, avatarUrl: true, role: { select: { code: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const partnerMap = new Map<string, any>();

    for (const msg of messages) {
      const partner = msg.senderId === userId ? msg.receiver : msg.sender;
      if (!partnerMap.has(partner.id)) {
        partnerMap.set(partner.id, {
          partner,
          lastMessage: msg.content || (msg.imageUrl ? '📷 Image' : '📄 PDF Document'),
          lastMessageAt: msg.createdAt,
          unreadCount: msg.receiverId === userId && !msg.isRead ? 1 : 0,
        });
      }
    }

    return Array.from(partnerMap.values());
  }

  async sendMessage(senderId: string, receiverId: string, data: { content?: string; imageUrl?: string; pdfUrl?: string; pdfAnnotationsJson?: string }) {
    const [sender, receiver] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: senderId }, include: { role: true, institute: { include: { settings: true } } } }),
      this.prisma.user.findUnique({ where: { id: receiverId }, include: { role: true } }),
    ]);

    if (!sender || !receiver) {
      throw new NotFoundException('Sender or receiver not found');
    }

    // 1. Security Rule: Strictly NO Student-to-Student messaging
    if (sender.role.code === RoleType.STUDENT && receiver.role.code === RoleType.STUDENT) {
      throw new ForbiddenException('Student-to-student direct messaging is disabled.');
    }

    // 2. Daily Quota Check (For Students)
    if (sender.role.code === RoleType.STUDENT && sender.institute?.settings) {
      const dailyLimit = sender.institute.settings.dailyMessageLimit || 20;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const messageCountToday = await this.prisma.chatMessage.count({
        where: {
          senderId,
          createdAt: { gte: todayStart },
        },
      });

      if (messageCountToday >= dailyLimit) {
        throw new ForbiddenException(`Daily chat limit of ${dailyLimit} messages reached for today.`);
      }
    }

    return this.prisma.chatMessage.create({
      data: {
        senderId,
        receiverId,
        content: data.content,
        imageUrl: data.imageUrl,
        pdfUrl: data.pdfUrl,
        pdfAnnotationsJson: data.pdfAnnotationsJson,
      },
    });
  }

  async markAsRead(senderId: string, receiverId: string) {
    return this.prisma.chatMessage.updateMany({
      where: { senderId, receiverId, isRead: false },
      data: { isRead: true },
    });
  }
}
