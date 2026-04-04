import { Module } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { MembershipsController, LessonsController, EnrollmentsController } from './memberships.controller';

@Module({
  controllers: [MembershipsController, LessonsController, EnrollmentsController],
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
