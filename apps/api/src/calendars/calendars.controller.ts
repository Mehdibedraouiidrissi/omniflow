import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CalendarsService } from './calendars.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  CreateCalendarDto, UpdateCalendarDto, SetAvailabilityDto,
  CreateMeetingTypeDto, BookAppointmentDto, RescheduleDto, CancelDto,
} from './dto/calendar.dto';

@ApiTags('Calendars')
@ApiBearerAuth('access-token')
@Controller('calendars')
export class CalendarsController {
  constructor(private calendarsService: CalendarsService) {}

  @Post()
  @RequirePermissions('calendars:create')
  @ApiOperation({ summary: 'Create a calendar' })
  async create(@CurrentTenant() tenantId: string, @CurrentUser() user: JwtPayload, @Body() dto: CreateCalendarDto) {
    return this.calendarsService.createCalendar(tenantId, user.sub, dto);
  }

  @Get()
  @RequirePermissions('calendars:read')
  @ApiOperation({ summary: 'List calendars' })
  async list(@CurrentTenant() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.calendarsService.listCalendars(tenantId, user.sub);
  }

  @Get(':id')
  @RequirePermissions('calendars:read')
  @ApiOperation({ summary: 'Get calendar with availability' })
  @ApiParam({ name: 'id', description: 'Calendar ID' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.calendarsService.findCalendar(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('calendars:update')
  @ApiOperation({ summary: 'Update calendar' })
  @ApiParam({ name: 'id', description: 'Calendar ID' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateCalendarDto) {
    return this.calendarsService.updateCalendar(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('calendars:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete calendar' })
  @ApiParam({ name: 'id', description: 'Calendar ID' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.calendarsService.deleteCalendar(tenantId, id);
  }

  @Post(':id/availability')
  @RequirePermissions('calendars:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set availability rules' })
  @ApiParam({ name: 'id', description: 'Calendar ID' })
  async setAvailability(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: SetAvailabilityDto) {
    return this.calendarsService.setAvailability(tenantId, id, dto.rules);
  }

  // --- Meeting Types ---

  @Get(':id/meeting-types')
  @RequirePermissions('calendars:read')
  @ApiOperation({ summary: 'List meeting types' })
  @ApiParam({ name: 'id', description: 'Calendar ID' })
  async listMeetingTypes(@CurrentTenant() tenantId: string, @Param('id') calendarId: string) {
    return this.calendarsService.listMeetingTypes(tenantId, calendarId);
  }

  @Post(':id/meeting-types')
  @RequirePermissions('calendars:create')
  @ApiOperation({ summary: 'Create a meeting type' })
  @ApiParam({ name: 'id', description: 'Calendar ID' })
  async createMeetingType(@CurrentTenant() tenantId: string, @Param('id') calendarId: string, @Body() dto: CreateMeetingTypeDto) {
    return this.calendarsService.createMeetingType(tenantId, calendarId, dto);
  }

  @Patch(':id/meeting-types/:mtId')
  @RequirePermissions('calendars:update')
  @ApiOperation({ summary: 'Update a meeting type' })
  @ApiParam({ name: 'id', description: 'Calendar ID' })
  @ApiParam({ name: 'mtId', description: 'Meeting Type ID' })
  async updateMeetingType(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('mtId') mtId: string,
    @Body() body: any,
  ) {
    return this.calendarsService.updateMeetingType(tenantId, id, mtId, body);
  }

  // --- Available Slots (Public) ---

  @Public()
  @Get(':id/slots')
  @ApiOperation({ summary: 'Get available time slots for a date range (public)' })
  @ApiParam({ name: 'id', description: 'Calendar ID' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'meetingTypeId', required: false })
  async getSlots(
    @Param('id') calendarId: string,
    @Query() query: { startDate: string; endDate: string; meetingTypeId?: string; tenantId?: string },
  ) {
    const tenantId = query.tenantId || '';
    return this.calendarsService.getAvailableSlots(tenantId, calendarId, query);
  }
}

@ApiTags('Appointments')
@ApiBearerAuth('access-token')
@Controller('appointments')
export class AppointmentsController {
  constructor(private calendarsService: CalendarsService) {}

  @Get()
  @RequirePermissions('calendars:read')
  @ApiOperation({ summary: 'List appointments with filters' })
  async list(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.calendarsService.listAppointments(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('calendars:read')
  @ApiOperation({ summary: 'Get appointment detail' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.calendarsService.findAppointment(tenantId, id);
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Book an appointment (public endpoint)' })
  async book(@Body() dto: BookAppointmentDto & { tenantId: string }) {
    return this.calendarsService.bookAppointment(dto.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('calendars:update')
  @ApiOperation({ summary: 'Update appointment' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.calendarsService.updateAppointment(tenantId, id, body);
  }

  @Post(':id/confirm')
  @RequirePermissions('calendars:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm appointment' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  async confirm(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.calendarsService.confirmAppointment(tenantId, id);
  }

  @Post(':id/cancel')
  @RequirePermissions('calendars:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel appointment with reason' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  async cancel(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: CancelDto) {
    return this.calendarsService.cancelAppointment(tenantId, id, dto.reason);
  }

  @Post(':id/reschedule')
  @RequirePermissions('calendars:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reschedule appointment' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  async reschedule(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: RescheduleDto) {
    return this.calendarsService.rescheduleAppointment(tenantId, id, dto);
  }

  @Post(':id/complete')
  @RequirePermissions('calendars:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark appointment complete' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  async complete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.calendarsService.completeAppointment(tenantId, id);
  }

  @Post(':id/no-show')
  @RequirePermissions('calendars:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark as no-show' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  async noShow(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.calendarsService.markNoShow(tenantId, id);
  }
}
