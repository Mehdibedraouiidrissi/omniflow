import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray, IsBoolean } from 'class-validator';

export class CreateCalendarDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: ['PERSONAL', 'TEAM', 'ROUND_ROBIN'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCalendarDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetAvailabilityDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  @IsArray()
  rules: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive?: boolean;
  }>;
}

export class CreateMeetingTypeDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  duration: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  bufferBefore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  bufferAfter?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxBookingsPerDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresConfirmation?: boolean;
}

export class BookAppointmentDto {
  @ApiProperty()
  @IsString()
  calendarId: string;

  @ApiProperty()
  @IsString()
  meetingTypeId: string;

  @ApiProperty()
  @IsString()
  contactId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiProperty()
  @IsString()
  startTime: string;

  @ApiProperty()
  @IsString()
  endTime: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class RescheduleDto {
  @ApiProperty()
  @IsString()
  startTime: string;

  @ApiProperty()
  @IsString()
  endTime: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
