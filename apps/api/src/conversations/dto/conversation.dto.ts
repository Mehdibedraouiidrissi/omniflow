import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty()
  @IsString()
  contactId: string;

  @ApiProperty({ enum: ['EMAIL', 'SMS', 'WHATSAPP', 'LIVE_CHAT', 'FACEBOOK', 'INSTAGRAM'] })
  @IsString()
  channel: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channel?: string;
}

export class AssignConversationDto {
  @ApiProperty()
  @IsString()
  assigneeId: string;
}

export class InternalNoteDto {
  @ApiProperty()
  @IsString()
  content: string;
}
