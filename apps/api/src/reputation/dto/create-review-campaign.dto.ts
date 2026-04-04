import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateReviewCampaignDto {
  @ApiProperty({ description: 'Campaign name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Message template ID to use' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'URL to redirect positive reviews to (Google, Yelp, etc.)' })
  @IsOptional()
  @IsUrl()
  redirectUrl?: string;
}

export class UpdateReviewCampaignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  redirectUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateId?: string;
}

export class SendReviewRequestsDto {
  @ApiProperty({ description: 'Contact IDs to send review requests to', type: [String] })
  @IsString({ each: true })
  contactIds: string[];

  @ApiPropertyOptional({ description: 'Channel to send through (email or sms)', default: 'email' })
  @IsOptional()
  @IsString()
  channel?: string;
}

export class SubmitReviewDto {
  @ApiProperty({ description: 'Rating from 1 to 5', minimum: 1, maximum: 5 })
  rating: number;

  @ApiPropertyOptional({ description: 'Feedback text' })
  @IsOptional()
  @IsString()
  feedback?: string;
}

export class RespondToReviewDto {
  @ApiProperty({ description: 'Response text' })
  @IsString()
  response: string;
}
