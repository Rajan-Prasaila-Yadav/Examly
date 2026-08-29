// apps/api/src/modules/test-engine/tests.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TestsService } from './tests.service';
import { CurrentUser, CurrentUserPayload } from '@/platform/rbac/decorators/current-user.decorator';

@ApiTags('Test & Examination Engine')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  // ──────────────────────────────────────────────
  // Test CRUD
  // ──────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List available tests' })
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.testsService.findAll(user.instituteId!, user.roleCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get test detail with sections and questions' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.testsService.findOne(id, user.instituteId!);
  }

  @Post()
  @ApiOperation({ summary: 'Create new test with sections' })
  async create(@Body() body: any, @CurrentUser() user: CurrentUserPayload) {
    return this.testsService.create(user.instituteId!, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update test configuration' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: CurrentUserPayload) {
    return this.testsService.update(id, user.instituteId!, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete test' })
  async delete(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.testsService.delete(id, user.instituteId!);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Toggle published / live status of test' })
  async togglePublish(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.testsService.togglePublish(id, user.instituteId!);
  }

  // ──────────────────────────────────────────────
  // Section CRUD
  // ──────────────────────────────────────────────

  @Post(':id/sections')
  @ApiOperation({ summary: 'Add a new section to test' })
  async addSection(@Param('id') testId: string, @Body() body: { name: string }) {
    return this.testsService.addSection(testId, body);
  }

  @Put('sections/:sectionId')
  @ApiOperation({ summary: 'Update section name or order' })
  async updateSection(@Param('sectionId') sectionId: string, @Body() body: { name?: string; sortOrder?: number }) {
    return this.testsService.updateSection(sectionId, body);
  }

  @Delete('sections/:sectionId')
  @ApiOperation({ summary: 'Delete section and its questions' })
  async deleteSection(@Param('sectionId') sectionId: string) {
    return this.testsService.deleteSection(sectionId);
  }

  // ──────────────────────────────────────────────
  // Question Management
  // ──────────────────────────────────────────────

  @Post(':id/questions')
  @ApiOperation({ summary: 'Add a new question to test section' })
  async addQuestion(@Param('id') testId: string, @Body() body: any) {
    return this.testsService.addQuestion(testId, body);
  }

  @Put('questions/:questionId')
  @ApiOperation({ summary: 'Update existing question' })
  async updateQuestion(@Param('questionId') questionId: string, @Body() body: any) {
    return this.testsService.updateQuestion(questionId, body);
  }

  @Delete('questions/:questionId')
  @ApiOperation({ summary: 'Delete question' })
  async deleteQuestion(@Param('questionId') questionId: string) {
    return this.testsService.deleteQuestion(questionId);
  }

  @Post(':id/bulk-import')
  @ApiOperation({ summary: 'Bulk import questions from structured data (SCR-ADM-14)' })
  async bulkImport(@Param('id') testId: string, @Body() body: { questions: any[] }) {
    return this.testsService.bulkImportQuestions(testId, body.questions);
  }

  // ──────────────────────────────────────────────
  // Analytics & Leaderboard
  // ──────────────────────────────────────────────

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get comprehensive test analytics (SCR-ADM-16)' })
  async getAnalytics(@Param('id') id: string) {
    return this.testsService.getTestAnalytics(id);
  }

  @Get(':id/leaderboard')
  @ApiOperation({ summary: 'Get student attempt results & leaderboard ranking' })
  async getLeaderboard(@Param('id') id: string) {
    return this.testsService.getAttemptsLeaderboard(id);
  }

  @Get(':id/answer-key')
  @ApiOperation({ summary: 'Get answer key & score calculation table (SCR-STU-16)' })
  async getAnswerKey(@Param('id') testId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.testsService.getAnswerKey(testId, user.userId);
  }

  // ──────────────────────────────────────────────
  // Live Test Attempt Flow
  // ──────────────────────────────────────────────

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a live test attempt (Student)' })
  async startAttempt(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.testsService.startAttempt(id, user.userId);
  }

  @Post('attempts/:attemptId/answer')
  @ApiOperation({ summary: 'Save question answer choice during live test' })
  async saveAnswer(
    @Param('attemptId') attemptId: string,
    @Body() body: { questionId: string; selectedOptionIds: string[]; isMarkedForReview?: boolean; timeSpentSeconds?: number },
  ) {
    return this.testsService.saveAnswer(attemptId, body);
  }

  @Post('attempts/:attemptId/submit')
  @ApiOperation({ summary: 'Submit live test attempt & calculate final score' })
  async submitAttempt(@Param('attemptId') attemptId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.testsService.submitAttempt(attemptId, user.userId);
  }

  @Post('attempts/:attemptId/strike')
  @ApiOperation({ summary: 'Record anti-cheat strike (tab switch / app blur)' })
  async recordStrike(@Param('attemptId') attemptId: string) {
    return this.testsService.recordCheatStrike(attemptId);
  }

  @Get('attempts/:attemptId/review')
  @ApiOperation({ summary: 'Check answers with solutions after submission (SCR-STU-15)' })
  async getAttemptReview(@Param('attemptId') attemptId: string) {
    return this.testsService.getAttemptReview(attemptId);
  }
}
