// apps/api/src/modules/catalog/notes.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotesService } from './notes.service';
import { PermissionGuard } from '@/platform/rbac/guards/permission.guard';
import { RequirePermission } from '@/platform/rbac/decorators/require-permission.decorator';

@ApiTags('Academic Catalog - Notes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get('lesson/:lessonId')
  @ApiOperation({ summary: 'Get all notes for a lesson' })
  @RequirePermission('notes', 'read')
  async findByLesson(@Param('lessonId') lessonId: string) {
    return this.notesService.findByLesson(lessonId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get note detail' })
  @RequirePermission('notes', 'read')
  async findOne(@Param('id') id: string) {
    return this.notesService.findOne(id);
  }

  @Post('lesson/:lessonId')
  @ApiOperation({ summary: 'Create new note in a lesson' })
  @RequirePermission('notes', 'create')
  async create(@Param('lessonId') lessonId: string, @Body() body: any) {
    return this.notesService.create(lessonId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update note' })
  @RequirePermission('notes', 'update')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.notesService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete note' })
  @RequirePermission('notes', 'delete')
  async delete(@Param('id') id: string) {
    return this.notesService.delete(id);
  }
}
