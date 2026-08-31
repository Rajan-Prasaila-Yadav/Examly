// apps/api/src/modules/catalog/subjects.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SubjectsService } from './subjects.service';
import { PermissionGuard } from '../../platform/rbac/guards/permission.guard';
import { RequirePermission } from '../../platform/rbac/decorators/require-permission.decorator';
import { CurrentUser } from '../../platform/rbac/decorators/current-user.decorator';

@ApiTags('Academic Catalog - Subjects')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get('batch/:batchId')
  @ApiOperation({ summary: 'Get all subjects for a batch' })
  @RequirePermission('subjects', 'read')
  async findByBatch(@Param('batchId') batchId: string, @CurrentUser() user: any) {
    return this.subjectsService.findByBatch(batchId, user?.roleCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subject detail with lessons' })
  @RequirePermission('subjects', 'read')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.subjectsService.findOne(id, user?.roleCode);
  }

  @Post('batch/:batchId')
  @ApiOperation({ summary: 'Create new subject in a batch' })
  @RequirePermission('subjects', 'create')
  async create(@Param('batchId') batchId: string, @Body() body: any) {
    return this.subjectsService.create(batchId, body);
  }

  @Put('reorder')
  @ApiOperation({ summary: 'Bulk reorder subjects' })
  @RequirePermission('subjects', 'update')
  async reorder(@Body() body: { ids: string[] }) {
    return this.subjectsService.reorder(body.ids || []);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update subject' })
  @RequirePermission('subjects', 'update')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.subjectsService.update(id, body);
  }

  @Get(':id/tests')
  @ApiOperation({ summary: 'Get subject-level tests' })
  @RequirePermission('subjects', 'read')
  async getSubjectTests(@Param('id') id: string) {
    return this.subjectsService.getSubjectTests(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete subject' })
  @RequirePermission('subjects', 'delete')
  async delete(@Param('id') id: string) {
    return this.subjectsService.delete(id);
  }
}
