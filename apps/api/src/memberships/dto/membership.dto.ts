import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['FREE', 'PAID', 'MEMBERSHIP'] })
  @IsOptional()
  @IsString()
  accessType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

export class UpdateCourseDto {
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
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

export class CreateModuleDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  position: number;
}

export class CreateLessonDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ['VIDEO', 'TEXT', 'AUDIO', 'PDF', 'QUIZ'] })
  @IsString()
  contentType: string;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  content?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiProperty()
  @IsNumber()
  position: number;
}

export class UpdateLessonProgressDto {
  @ApiProperty({ enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] })
  @IsString()
  status: string;
}

export class EnrollDto {
  @ApiProperty()
  @IsString()
  contactId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;
}
