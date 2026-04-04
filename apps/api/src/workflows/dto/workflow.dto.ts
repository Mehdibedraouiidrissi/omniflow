import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateWorkflowDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['FORM_SUBMITTED', 'CONTACT_CREATED', 'TAG_ADDED', 'APPOINTMENT_BOOKED', 'STAGE_CHANGED', 'PAYMENT_SUCCEEDED', 'MESSAGE_RECEIVED', 'WEBHOOK', 'MANUAL'] })
  @IsString()
  triggerType: string;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  triggerConfig?: Record<string, unknown>;
}

export class UpdateWorkflowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  triggerConfig?: Record<string, unknown>;
}

export class UpdateStepsDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  @IsArray()
  steps: Record<string, unknown>[];
}

export class TestWorkflowDto {
  @ApiProperty({ description: 'Sample data to test with', type: 'object' })
  sampleData: Record<string, unknown>;
}
