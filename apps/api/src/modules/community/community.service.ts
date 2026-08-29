// apps/api/src/modules/community/community.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { ReactionType } from '@prisma/client';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeed(instituteId: string, batchId?: string) {
    const where: any = { instituteId };

    if (batchId) {
      where.OR = [{ batchId }, { batchId: null }]; // Batch-specific or Institute-wide
    }

    return this.prisma.communityPost.findMany({
      where,
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true, role: { select: { code: true } } } },
        poll: {
          include: {
            options: {
              include: {
                _count: { select: { votes: true } },
              },
              orderBy: { sortOrder: 'asc' },
            },
            _count: { select: { votes: true } },
          },
        },
        reactions: true,
        _count: { select: { comments: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    });
  }

  async createPost(authorId: string, instituteId: string, data: { title: string; contentHtml: string; batchId?: string; imageUrls?: string[]; pdfAttachmentUrl?: string; isPinned?: boolean; poll?: { question: string; isMultiChoice?: boolean; options: string[] } }) {
    return this.prisma.communityPost.create({
      data: {
        instituteId,
        authorId,
        batchId: data.batchId,
        title: data.title,
        contentHtml: data.contentHtml,
        imageUrls: data.imageUrls || [],
        pdfAttachmentUrl: data.pdfAttachmentUrl,
        isPinned: data.isPinned || false,
        poll: data.poll
          ? {
              create: {
                question: data.poll.question,
                isMultiChoice: data.poll.isMultiChoice || false,
                options: {
                  create: data.poll.options.map((opt, idx) => ({
                    optionText: opt,
                    sortOrder: idx + 1,
                  })),
                },
              },
            }
          : undefined,
      },
      include: {
        author: { select: { fullName: true, avatarUrl: true } },
        poll: { include: { options: true } },
      },
    });
  }

  async reactToPost(postId: string, userId: string, reactionType: ReactionType) {
    // 1 Reaction Rule: Upsert so previous reaction is replaced
    return this.prisma.postReaction.upsert({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
      update: { reactionType },
      create: {
        postId,
        userId,
        reactionType,
      },
    });
  }

  async votePoll(pollId: string, optionId: string, userId: string) {
    return this.prisma.pollVote.create({
      data: {
        pollId,
        optionId,
        userId,
      },
    });
  }

  async addComment(postId: string, userId: string, content: string, parentId?: string) {
    return this.prisma.postComment.create({
      data: {
        postId,
        userId,
        parentId,
        content,
      },
      include: {
        user: { select: { fullName: true, avatarUrl: true, role: { select: { code: true } } } },
      },
    });
  }

  async getComments(postId: string) {
    return this.prisma.postComment.findMany({
      where: { postId, parentId: null }, // Top-level comments
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true, role: { select: { code: true } } } },
        replies: {
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true, role: { select: { code: true } } } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'asc' }],
    });
  }
}
