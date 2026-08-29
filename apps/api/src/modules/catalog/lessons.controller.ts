// apps/api/src/modules/catalog/lessons.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LessonsService } from './lessons.service';
import { PermissionGuard } from '@/platform/rbac/guards/permission.guard';
import { RequirePermission } from '@/platform/rbac/decorators/require-permission.decorator';

@ApiTags('Academic Catalog - Lessons & Content')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get lesson details with videos, notes, and resource folder tree' })
  @RequirePermission('lessons', 'read')
  async findOne(@Param('id') id: string) {
    return this.lessonsService.findOne(id);
  }

  @Post('subject/:subjectId')
  @ApiOperation({ summary: 'Create new lesson in a subject' })
  @RequirePermission('lessons', 'create')
  async create(@Param('subjectId') subjectId: string, @Body() body: any) {
    return this.lessonsService.create(subjectId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update lesson' })
  @RequirePermission('lessons', 'update')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.lessonsService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete lesson' })
  @RequirePermission('lessons', 'delete')
  async delete(@Param('id') id: string) {
    return this.lessonsService.delete(id);
  }

  @Post(':id/videos')
  @ApiOperation({ summary: 'Upload / attach video lecture to lesson' })
  @RequirePermission('videos', 'create')
  async addVideo(@Param('id') lessonId: string, @Body() body: any) {
    return this.lessonsService.addVideo(lessonId, body);
  }

  @Put('videos/:videoId')
  @ApiOperation({ summary: 'Update video lecture' })
  @RequirePermission('videos', 'update')
  async updateVideo(@Param('videoId') videoId: string, @Body() body: any) {
    return this.lessonsService.updateVideo(videoId, body);
  }

  @Delete('videos/:videoId')
  @ApiOperation({ summary: 'Delete video lecture' })
  @RequirePermission('videos', 'delete')
  async deleteVideo(@Param('videoId') videoId: string) {
    return this.lessonsService.deleteVideo(videoId);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Upload PDF note / handout to lesson' })
  @RequirePermission('notes', 'create')
  async addNote(@Param('id') lessonId: string, @Body() body: any) {
    return this.lessonsService.addNote(lessonId, body);
  }

  @Put('notes/:noteId')
  @ApiOperation({ summary: 'Update PDF note' })
  @RequirePermission('notes', 'update')
  async updateNote(@Param('noteId') noteId: string, @Body() body: any) {
    return this.lessonsService.updateNote(noteId, body);
  }

  @Delete('notes/:noteId')
  @ApiOperation({ summary: 'Delete PDF note' })
  @RequirePermission('notes', 'delete')
  async deleteNote(@Param('noteId') noteId: string) {
    return this.lessonsService.deleteNote(noteId);
  }

  @Post(':id/resources')
  @ApiOperation({ summary: 'Create folder or add file to lesson resource tree' })
  async addResourceNode(@Param('id') lessonId: string, @Body() body: any) {
    return this.lessonsService.addResourceNode(lessonId, body);
  }

  @Delete('resources/:nodeId')
  @ApiOperation({ summary: 'Delete resource node' })
  async deleteResourceNode(@Param('nodeId') nodeId: string) {
    return this.lessonsService.deleteResourceNode(nodeId);
  }
}
