import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateFormDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: ['FORM', 'SURVEY', 'QUIZ'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  fields?: Record<string, unknown>[];

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  settings?: Record<string, unknown>;
}

export class UpdateFormDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  fields?: Record<string, unknown>[];

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  settings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  submitButtonText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  successMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  redirectUrl?: string;
}

export class SubmitFormDto {
  @ApiProperty({ type: 'object' })
  data: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;
}
