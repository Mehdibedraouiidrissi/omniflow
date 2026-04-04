import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SocialService } from './social.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { ConnectAccountDto, CreatePostDto, UpdatePostDto } from './dto/social.dto';

@ApiTags('Social')
@ApiBearerAuth('access-token')
@Controller('social')
export class SocialController {
  constructor(private socialService: SocialService) {}

  @Get('accounts')
  @RequirePermissions('social:read')
  @ApiOperation({ summary: 'List connected social accounts' })
  async listAccounts(@CurrentTenant() tenantId: string) {
    return this.socialService.listAccounts(tenantId);
  }

  @Post('accounts')
  @RequirePermissions('social:create')
  @ApiOperation({ summary: 'Connect a social media account' })
  async connectAccount(@CurrentTenant() tenantId: string, @Body() dto: ConnectAccountDto) {
    return this.socialService.connectAccount(tenantId, dto);
  }

  @Delete('accounts/:id')
  @RequirePermissions('social:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect a social account' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  async disconnectAccount(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.socialService.disconnectAccount(tenantId, id);
  }

  @Get('posts')
  @RequirePermissions('social:read')
  @ApiOperation({ summary: 'List posts with filters' })
  async listPosts(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.socialService.listPosts(tenantId, query);
  }

  @Post('posts')
  @RequirePermissions('social:create')
  @ApiOperation({ summary: 'Create/schedule a post' })
  async createPost(@CurrentTenant() tenantId: string, @Body() dto: CreatePostDto) {
    return this.socialService.createPost(tenantId, dto);
  }

  @Patch('posts/:id')
  @RequirePermissions('social:update')
  @ApiOperation({ summary: 'Update a post' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  async updatePost(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.socialService.updatePost(tenantId, id, dto);
  }

  @Delete('posts/:id')
  @RequirePermissions('social:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a post' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  async deletePost(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.socialService.deletePost(tenantId, id);
  }

  @Post('posts/:id/approve')
  @RequirePermissions('social:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a post' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  async approvePost(@CurrentTenant() tenantId: string, @CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.socialService.approvePost(tenantId, id, user.sub);
  }

  @Post('posts/:id/publish')
  @RequirePermissions('social:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a post immediately' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  async publishPost(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.socialService.publishPost(tenantId, id);
  }

  @Get('calendar')
  @RequirePermissions('social:read')
  @ApiOperation({ summary: 'Get scheduled posts calendar view' })
  async getCalendar(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.socialService.getCalendar(tenantId, query);
  }
}
