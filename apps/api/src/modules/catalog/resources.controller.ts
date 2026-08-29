// apps/api/src/modules/catalog/resources.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ResourcesService } from './resources.service';
import { PermissionGuard } from '../../platform/rbac/guards/permission.guard';
import { RequirePermission } from '../../platform/rbac/decorators/require-permission.decorator';

@ApiTags('Academic Catalog - Resources')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get('lesson/:lessonId')
  @ApiOperation({ summary: 'Get resource tree for a lesson' })
  @RequirePermission('resources', 'read')
  async findByLesson(@Param('lessonId') lessonId: string) {
    return this.resourcesService.findByLesson(lessonId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get resource node detail' })
  @RequirePermission('resources', 'read')
  async findOne(@Param('id') id: string) {
    return this.resourcesService.findOne(id);
  }

  @Post('lesson/:lessonId')
  @ApiOperation({ summary: 'Create resource node in a lesson' })
  @RequirePermission('resources', 'create')
  async create(@Param('lessonId') lessonId: string, @Body() body: any) {
    return this.resourcesService.create(lessonId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update resource node' })
  @RequirePermission('resources', 'update')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.resourcesService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete resource node' })
  @RequirePermission('resources', 'delete')
  async delete(@Param('id') id: string) {
    return this.resourcesService.delete(id);
  }
}
