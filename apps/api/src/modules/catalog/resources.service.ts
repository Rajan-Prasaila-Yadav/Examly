// apps/api/src/modules/catalog/resources.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByLesson(lessonId: string) {
    return this.prisma.resourceNode.findMany({
      where: { lessonId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const resource = await this.prisma.resourceNode.findUnique({
      where: { id },
      include: { lesson: true, parent: true, children: true },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    return resource;
  }

  async create(lessonId: string, body: any) {
    const { title, isFolder, parentId, fileUrl, fileType, sortOrder } = body;

    // Verify lesson exists
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // If parentId is provided, verify parent exists
    if (parentId) {
      const parent = await this.prisma.resourceNode.findUnique({
        where: { id: parentId },
      });

      if (!parent) {
        throw new NotFoundException('Parent resource not found');
      }
    }

    return this.prisma.resourceNode.create({
      data: {
        lessonId,
        parentId,
        isFolder: isFolder || false,
        title,
        fileUrl: isFolder ? undefined : fileUrl,
        fileType: isFolder ? 'folder' : fileType,
        sortOrder: sortOrder || 0,
      },
    });
  }

  async update(id: string, body: any) {
    const { title, fileUrl, fileType, sortOrder } = body;

    return this.prisma.resourceNode.update({
      where: { id },
      data: {
        title,
        fileUrl,
        fileType,
        sortOrder,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.resourceNode.delete({
      where: { id },
    });
  }
}
