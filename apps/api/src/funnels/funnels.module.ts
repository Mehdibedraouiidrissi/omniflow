import { Module } from '@nestjs/common';
import { FunnelsService } from './funnels.service';
import { FunnelsController } from './funnels.controller';

@Module({
  controllers: [FunnelsController],
  providers: [FunnelsService],
  exports: [FunnelsService],
})
export class FunnelsModule {}
