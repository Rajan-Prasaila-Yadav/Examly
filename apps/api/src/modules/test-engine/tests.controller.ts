// apps/api/src/modules/test-engine/tests.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Res,
  UseInterceptors,
  UploadedFiles,
  ForbiddenException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { TestsService } from './tests.service';
import { AiQuestionImportService } from './ai-question-import.service';
import { CurrentUser, CurrentUserPayload } from '../../platform/rbac/decorators/current-user.decorator';
import { PermissionGuard } from '../../platform/rbac/guards/permission.guard';
import { RequirePermission } from '../../platform/rbac/decorators/require-permission.decorator';

@ApiTags('Test & Examination Engine')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller('tests')
export class TestsController {
  constructor(
    private readonly testsService: TestsService,
    private readonly aiImportService: AiQuestionImportService,
  ) {}

  // ──────────────────────────────────────────────
  // Test CRUD
  // ──────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List tests visible to current institute / user' })
  @RequirePermission('tests', 'read')
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.testsService.findAll(user.instituteId!, user.roleCode, user.batchId, user.userId);
  }

  @Post('ai-parse')
  @ApiOperation({ summary: 'Parse text, images, or PDFs into structured questions' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @RequirePermission('tests', 'create')
  @UseInterceptors(FilesInterceptor('files', 15, { limits: { fileSize: 15 * 1024 * 1024 } }))
  async aiParse(
    @UploadedFiles() files: any[],
    @Body() body: { rawText?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (user.roleCode === 'STUDENT') {
      throw new ForbiddenException('Students are not permitted to author or import questions.');
    }
    const parsed = await this.aiImportService.parse({
      rawText: body?.rawText,
      files: files || [],
    });
    return { parsedQuestions: parsed, count: parsed.length };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get test detail with sections and questions' })
  @RequirePermission('tests', 'read')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.testsService.findOne(id, user.instituteId!);
  }

  @Post()
  @ApiOperation({ summary: 'Create new test with sections' })
  @RequirePermission('tests', 'create')
  async create(@Body() body: any, @CurrentUser() user: CurrentUserPayload) {
    if (user.roleCode === 'STUDENT') {
      throw new ForbiddenException('Students are not permitted to create tests.');
    }
    return this.testsService.create(user.instituteId!, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update test configuration' })
  @RequirePermission('tests', 'update')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: CurrentUserPayload) {
    if (user.roleCode === 'STUDENT') {
      throw new ForbiddenException('Students are not permitted to modify tests.');
    }
    return this.testsService.update(id, user.instituteId!, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete test' })
  @RequirePermission('tests', 'delete')
  async delete(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    if (user.roleCode === 'STUDENT') {
      throw new ForbiddenException('Students are not permitted to delete tests.');
    }
    return this.testsService.delete(id, user.instituteId!);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Toggle published / live status of test' })
  @RequirePermission('tests', 'publish')
  async togglePublish(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    if (user.roleCode === 'STUDENT') {
      throw new ForbiddenException('Students are not permitted to publish tests.');
    }
    return this.testsService.togglePublish(id, user.instituteId!);
  }

  // ──────────────────────────────────────────────
  // Section CRUD
  // ──────────────────────────────────────────────

  @Post(':id/sections')
  @ApiOperation({ summary: 'Add a new section to test' })
  @RequirePermission('tests', 'update')
  async addSection(@Param('id') testId: string, @Body() body: { name: string }, @CurrentUser() user: CurrentUserPayload) {
    if (user.roleCode === 'STUDENT') {
      throw new ForbiddenException('Students are not permitted to manage test sections.');
    }
    return this.testsService.addSection(testId, body);
  }

  @Put('sections/:sectionId')
  @ApiOperation({ summary: 'Update section name or order' })
  @RequirePermission('tests', 'update')
  async updateSection(
    @Param('sectionId') sectionId: string,
    @Body() body: { name?: string; sortOrder?: number },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (user.roleCode === 'STUDENT') {
      throw new ForbiddenException('Students are not permitted to manage test sections.');
    }
    return this.testsService.updateSection(sectionId, body);
  }

  @Delete('sections/:sectionId')
  @ApiOperation({ summary: 'Delete section and its questions' })
  @RequirePermission('tests', 'update')
  async deleteSection(@Param('sectionId') sectionId: string, @CurrentUser() user: CurrentUserPayload) {
    if (user.roleCode === 'STUDENT') {
      throw new ForbiddenException('Students are not permitted to manage test sections.');
    }
    return this.testsService.deleteSection(sectionId);
  }

  // ──────────────────────────────────────────────
  // Question Management
  // ──────────────────────────────────────────────

  @Post(':id/questions')
  @ApiOperation({ summary: 'Add a new question to test section' })
  @RequirePermission('tests', 'create')
  async addQuestion(@Param('id') testId: string, @Body() body: any, @CurrentUser() user: CurrentUserPayload) {
    if (user.roleCode === 'STUDENT') {
      throw new ForbiddenException('Students are not permitted to author questions.');
    }
    return this.testsService.addQuestion(testId, body);
  }

  @Put('questions/:questionId')
  @ApiOperation({ summary: 'Update existing question' })
  @RequirePermission('tests', 'update')
  async updateQuestion(@Param('questionId') questionId: string, @Body() body: any, @CurrentUser() user: CurrentUserPayload) {
    if (user.roleCode === 'STUDENT') {
      throw new ForbiddenException('Students are not permitted to author questions.');
    }
    return this.testsService.updateQuestion(questionId, body);
  }

  @Delete('questions/:questionId')
  @ApiOperation({ summary: 'Delete question' })
  @RequirePermission('tests', 'update')
  async deleteQuestion(@Param('questionId') questionId: string, @CurrentUser() user: CurrentUserPayload) {
    if (user.roleCode === 'STUDENT') {
      throw new ForbiddenException('Students are not permitted to delete questions.');
    }
    return this.testsService.deleteQuestion(questionId);
  }

  @Post(':id/bulk-import')
  @ApiOperation({ summary: 'Bulk import questions from structured data (SCR-ADM-14)' })
  @RequirePermission('tests', 'create')
  async bulkImport(@Param('id') testId: string, @Body() body: { questions: any[] }, @CurrentUser() user: CurrentUserPayload) {
    if (user.roleCode === 'STUDENT') {
      throw new ForbiddenException('Students are not permitted to bulk import questions.');
    }
    return this.testsService.bulkImportQuestions(testId, body.questions);
  }

  @Post(':id/ai-import')
  @ApiOperation({ summary: 'Parse material with Gemini and optionally persist questions on this test' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @RequirePermission('tests', 'create')
  @UseInterceptors(FilesInterceptor('files', 15, { limits: { fileSize: 15 * 1024 * 1024 } }))
  async aiImport(
    @Param('id') testId: string,
    @UploadedFiles() files: any[],
    @Body() body: { rawText?: string; persist?: string },
  ) {
    const parsed = await this.aiImportService.parse({
      rawText: body?.rawText,
      files: files || [],
    });
    if (body?.persist === 'true' || body?.persist === '1') {
      const imported = await this.testsService.bulkImportQuestions(testId, parsed as any);
      return { testId, parsedQuestions: parsed, count: parsed.length, imported: imported.imported };
    }
    return { testId, parsedQuestions: parsed, count: parsed.length };
  }

  // ──────────────────────────────────────────────
  // Analytics & Leaderboard
  // ──────────────────────────────────────────────

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get comprehensive test analytics (SCR-ADM-16)' })
  @RequirePermission('tests', 'read')
  async getAnalytics(@Param('id') id: string) {
    return this.testsService.getTestAnalytics(id);
  }

  @Get(':id/leaderboard')
  @ApiOperation({ summary: 'Get student attempt results & leaderboard ranking' })
  @RequirePermission('tests', 'read')
  async getLeaderboard(@Param('id') id: string) {
    return this.testsService.getAttemptsLeaderboard(id);
  }

  @Get(':id/attempts')
  @ApiOperation({ summary: 'Get all attempts history for a test (admin) incl. count per student & each score' })
  @RequirePermission('tests', 'read')
  async getTestAttempts(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    if (user.roleCode === 'STUDENT' || user.roleCode === 'TEACHER') {
      return this.testsService.getStudentAttempts(id, user.userId);
    }
    return this.testsService.getTestAttempts(id);
  }

  @Get(':id/my-attempts')
  @ApiOperation({ summary: 'Get current user\'s attempt history for a test' })
  @RequirePermission('tests', 'read')
  async getMyAttempts(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.testsService.getStudentAttempts(id, user.userId);
  }

  @Get(':id/answer-key')
  @ApiOperation({ summary: 'Get answer key & score calculation table (SCR-STU-16)' })
  @RequirePermission('tests', 'read')
  async getAnswerKey(@Param('id') testId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.testsService.getAnswerKey(testId, user.userId);
  }

  // ──────────────────────────────────────────────
  // Exports (PDF / Excel) — with headers, footers, page numbers & timestamps
  // ──────────────────────────────────────────────

  @Get(':id/export/attempts/pdf')
  @ApiOperation({ summary: 'Download attempts history as PDF' })
  @RequirePermission('tests', 'read')
  async exportAttemptsPdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.testsService.exportAttemptsPdf(id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': buffer.length });
    res.end(buffer);
  }

  @Get(':id/export/attempts/excel')
  @ApiOperation({ summary: 'Download attempts history as Excel (xlsx)' })
  @RequirePermission('tests', 'read')
  async exportAttemptsExcel(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.testsService.exportAttemptsExcel(id);
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': buffer.length });
    res.end(buffer);
  }

  @Get(':id/export/leaderboard/pdf')
  @ApiOperation({ summary: 'Download leaderboard as PDF' })
  @RequirePermission('tests', 'read')
  async exportLeaderboardPdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.testsService.exportLeaderboardPdf(id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': buffer.length });
    res.end(buffer);
  }

  @Get(':id/export/leaderboard/excel')
  @ApiOperation({ summary: 'Download leaderboard as Excel (xlsx)' })
  @RequirePermission('tests', 'read')
  async exportLeaderboardExcel(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.testsService.exportLeaderboardExcel(id);
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': buffer.length });
    res.end(buffer);
  }

  @Get(':id/export/answer-key/pdf')
  @ApiOperation({ summary: 'Download answer key / score table as PDF' })
  @RequirePermission('tests', 'read')
  async exportAnswerKeyPdf(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload, @Res() res: Response) {
    const { buffer, filename } = await this.testsService.exportAnswerKeyPdf(id, user.userId);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': buffer.length });
    res.end(buffer);
  }

  @Get(':id/export/answer-key/excel')
  @ApiOperation({ summary: 'Download answer key / score table as Excel (xlsx)' })
  @RequirePermission('tests', 'read')
  async exportAnswerKeyExcel(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload, @Res() res: Response) {
    const { buffer, filename } = await this.testsService.exportAnswerKeyExcel(id, user.userId);
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': buffer.length });
    res.end(buffer);
  }

  // ──────────────────────────────────────────────
  // Live Test Attempt Flow
  // ──────────────────────────────────────────────

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a live test attempt (Student or Admin Preview)' })
  @RequirePermission('tests', 'take')
  async startAttempt(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.testsService.startAttempt(id, user.userId, user.roleCode);
  }

  @Post('attempts/:attemptId/answer')
  @ApiOperation({ summary: 'Save question answer choice during live test' })
  @RequirePermission('tests', 'take')
  async saveAnswer(
    @Param('attemptId') attemptId: string,
    @Body() body: { questionId: string; selectedOptionIds: string[]; isMarkedForReview?: boolean; timeSpentSeconds?: number },
  ) {
    return this.testsService.saveAnswer(attemptId, body);
  }

  @Post('attempts/:attemptId/submit')
  @ApiOperation({ summary: 'Submit live test attempt & calculate final score' })
  @RequirePermission('tests', 'take')
  async submitAttempt(@Param('attemptId') attemptId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.testsService.submitAttempt(attemptId, user.userId);
  }

  @Post('attempts/:attemptId/strike')
  @ApiOperation({ summary: 'Record anti-cheat strike (tab switch / app blur)' })
  @RequirePermission('tests', 'take')
  async recordStrike(@Param('attemptId') attemptId: string) {
    return this.testsService.recordCheatStrike(attemptId);
  }

  @Get('attempts/:attemptId/review')
  @ApiOperation({ summary: 'Check answers with solutions after submission (SCR-STU-15)' })
  @RequirePermission('tests', 'take')
  async getAttemptReview(@Param('attemptId') attemptId: string) {
    return this.testsService.getAttemptReview(attemptId);
  }
}
