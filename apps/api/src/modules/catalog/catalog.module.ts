// apps/api/src/modules/catalog/catalog.module.ts
import { Module } from '@nestjs/common';
import { BatchesService } from './batches.service';
import { BatchesController } from './batches.controller';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';

@Module({
  controllers: [BatchesController, SubjectsController, LessonsController],
  providers: [BatchesService, SubjectsService, LessonsService],
  exports: [BatchesService, SubjectsService, LessonsService],
})
export class CatalogModule {}
