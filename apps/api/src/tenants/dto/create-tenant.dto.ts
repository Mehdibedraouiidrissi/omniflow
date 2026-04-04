import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, MinLength, IsEnum } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Marketing Agency' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'AGENCY', enum: ['AGENCY', 'BUSINESS'] })
  @IsOptional()
  @IsEnum(['AGENCY', 'BUSINESS'])
  type?: 'AGENCY' | 'BUSINESS';

  @ApiPropertyOptional({ description: 'Parent tenant ID (for sub-accounts)' })
  @IsOptional()
  @IsString()
  parentId?: string;
}
