// apps/api/src/modules/users/users.controller.ts
import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CreateStudentDto, CreateTeacherDto, UpdateUserStatusDto, UpdateTeacherPermissionsDto } from './dto/create-student.dto';
import { CurrentUser, CurrentUserPayload } from '../../platform/rbac/decorators/current-user.decorator';
import { PermissionGuard } from '../../platform/rbac/guards/permission.guard';
import { RequirePermission } from '../../platform/rbac/decorators/require-permission.decorator';

@ApiTags('User Management (Students & Teachers)')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('students')
  @ApiOperation({ summary: 'Get list of enrolled students' })
  @ApiQuery({ name: 'batchId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @RequirePermission('students', 'read')
  async getStudents(
    @CurrentUser() user: CurrentUserPayload,
    @Query('batchId') batchId?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.getStudents(user.instituteId!, batchId, search);
  }

  @Get('students/:id/360')
  @ApiOperation({ summary: 'Get 360-degree student profile analytics' })
  @RequirePermission('students', 'read')
  async getStudent360(@Param('id') id: string) {
    return this.usersService.getStudent360(id);
  }

  @Get('teachers')
  @ApiOperation({ summary: 'Get list of faculty teachers' })
  @RequirePermission('teachers', 'read')
  async getTeachers(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getTeachers(user.instituteId!);
  }

  @Get('teachers/:id/360')
  @ApiOperation({ summary: 'Get 360-degree teacher profile' })
  @RequirePermission('teachers', 'read')
  async getTeacher360(@Param('id') id: string) {
    return this.usersService.getTeacher360(id);
  }

  @Post('students')
  @ApiOperation({ summary: 'Enroll new student (Admin)' })
  @RequirePermission('students', 'create')
  async createStudent(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateStudentDto) {
    return this.usersService.createStudent(user.instituteId!, dto);
  }

  @Put('students/:id')
  @ApiOperation({ summary: 'Update student profile (Admin)' })
  @RequirePermission('students', 'update')
  async updateStudent(@Param('id') id: string, @Body() dto: any) {
    return this.usersService.updateStudent(id, dto);
  }

  @Post('teachers')
  @ApiOperation({ summary: 'Onboard new faculty teacher (Admin)' })
  @RequirePermission('teachers', 'create')
  async createTeacher(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateTeacherDto) {
    return this.usersService.createTeacher(user.instituteId!, dto);
  }

  @Put('teachers/:id')
  @ApiOperation({ summary: 'Update teacher profile (Admin)' })
  @RequirePermission('teachers', 'update')
  async updateTeacher(@Param('id') id: string, @Body() dto: any) {
    return this.usersService.updateTeacher(id, dto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update user status (Block/Unblock/Lock)' })
  @RequirePermission('users', 'update')
  async updateUserStatus(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(id, user.instituteId!, dto);
  }

  @Put(':id/permissions')
  @ApiOperation({ summary: 'Update teacher custom permission grants' })
  @RequirePermission('teachers', 'update')
  async updateTeacherPermissions(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateTeacherPermissionsDto,
  ) {
    return this.usersService.updateTeacherPermissions(id, user.instituteId!, dto);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get all system and institute roles with permissions matrix' })
  async getRoles(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getRoles(user.instituteId);
  }

  @Put('roles/:roleId/matrix')
  @ApiOperation({ summary: 'Update permissions matrix for a role' })
  @RequirePermission('roles', 'update')
  async updateRoleMatrix(
    @Param('roleId') roleId: string,
    @Body() body: { permissions: { resource: string; action: string }[] },
  ) {
    return this.usersService.updateRoleMatrix(roleId, body.permissions);
  }
}
