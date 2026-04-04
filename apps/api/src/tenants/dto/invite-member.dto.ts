import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class InviteMemberDto {
  @ApiProperty({ example: 'newmember@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Role ID to assign' })
  @IsOptional()
  @IsString()
  roleId?: string;
}
