import { Module } from '@nestjs/common';
import { PipelinesService } from './pipelines.service';
import { PipelinesController, OpportunitiesController } from './pipelines.controller';

@Module({
  controllers: [PipelinesController, OpportunitiesController],
  providers: [PipelinesService],
  exports: [PipelinesService],
})
export class PipelinesModule {}
