// apps/api/src/modules/test-engine/test-engine.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';
import { AiQuestionImportService } from './ai-question-import.service';
import { PermissionGuard } from '../../platform/rbac/guards/permission.guard';

@Module({
  imports: [ConfigModule],
  controllers: [TestsController],
  providers: [TestsService, AiQuestionImportService, PermissionGuard],
  exports: [TestsService, PermissionGuard],
})
export class TestEngineModule {}
