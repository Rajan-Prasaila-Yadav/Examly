// apps/api/src/modules/test-engine/test-engine.module.ts
import { Module } from '@nestjs/common';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';

@Module({
  controllers: [TestsController],
  providers: [TestsService],
  exports: [TestsService],
})
export class TestEngineModule {}
