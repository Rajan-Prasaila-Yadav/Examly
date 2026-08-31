// apps/api/src/modules/catalog/catalog.module.ts
import { Module } from '@nestjs/common';
import { BatchesService } from './batches.service';
import { BatchesController } from './batches.controller';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { ResourcesService } from './resources.service';
import { ResourcesController } from './resources.controller';
import { VideoGateway } from './video.gateway';

@Module({
  controllers: [BatchesController, SubjectsController, LessonsController, NotesController, ResourcesController],
  providers: [BatchesService, SubjectsService, LessonsService, NotesService, ResourcesService, VideoGateway],
  exports: [BatchesService, SubjectsService, LessonsService, NotesService, ResourcesService, VideoGateway],
})
export class CatalogModule {}

