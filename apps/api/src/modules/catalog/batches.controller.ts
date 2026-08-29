// apps/api/src/modules/catalog/batches.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { BatchesService } from './batches.service';
import { CurrentUser, CurrentUserPayload } from '../../platform/rbac/decorators/current-user.decorator';
import { PermissionGuard } from '../../platform/rbac/guards/permission.guard';
import { RequirePermission } from '../../platform/rbac/decorators/require-permission.decorator';

@ApiTags('Academic Catalog - Batches')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of batches' })
  @RequirePermission('batches', 'read')
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.batchesService.findAll(user.instituteId!, user.roleCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get batch detail with subjects and lessons' })
  @RequirePermission('batches', 'read')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.batchesService.findOne(id, user.instituteId!);
  }

  @Post()
  @ApiOperation({ summary: 'Create new batch' })
  @RequirePermission('batches', 'create')
  async create(@Body() body: any, @CurrentUser() user: CurrentUserPayload) {
    return this.batchesService.create(user.instituteId!, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update batch' })
  @RequirePermission('batches', 'update')
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.batchesService.update(id, user.instituteId!, body);
  }

  @Post(':id/students')
  @ApiOperation({ summary: 'Enroll students in batch' })
  @RequirePermission('batches', 'update')
  async enrollStudents(
    @Param('id') id: string,
    @Body() body: { studentIds: string[] },
  ) {
    return this.batchesService.enrollStudents(id, body.studentIds || []);
  }

  @Get(':id/students')
  @ApiOperation({ summary: 'Get batch enrolled students' })
  @RequirePermission('batches', 'read')
  async getStudents(@Param('id') id: string) {
    return this.batchesService.getStudents(id);
  }

  @Delete(':id/students/:studentId')
  @ApiOperation({ summary: 'Remove student from batch' })
  @RequirePermission('batches', 'update')
  async removeStudent(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    return this.batchesService.removeStudent(id, studentId);
  }

  @Get(':id/teachers')
  @ApiOperation({ summary: 'Get teachers for batch' })
  @RequirePermission('batches', 'read')
  async getTeachers(@Param('id') id: string) {
    return this.batchesService.getTeachers(id);
  }

  @Get(':id/tests')
  @ApiOperation({ summary: 'Get batch-level tests' })
  @RequirePermission('batches', 'read')
  async getBatchTests(@Param('id') id: string) {
    return this.batchesService.getBatchTests(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete batch' })
  @RequirePermission('batches', 'delete')
  async delete(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.batchesService.delete(id, user.instituteId!);
  }
}
