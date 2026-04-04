import { Module } from '@nestjs/common';
import { CalendarsService } from './calendars.service';
import { CalendarsController, AppointmentsController } from './calendars.controller';

@Module({
  controllers: [CalendarsController, AppointmentsController],
  providers: [CalendarsService],
  exports: [CalendarsService],
})
export class CalendarsModule {}
