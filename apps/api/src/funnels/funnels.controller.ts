import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { FunnelsService } from './funnels.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Funnels')
@ApiBearerAuth('access-token')
@Controller('funnels')
export class FunnelsController {
  constructor(private funnelsService: FunnelsService) {}

  @Post()
  @RequirePermissions('funnels:create')
  @ApiOperation({ summary: 'Create a funnel' })
  async create(@CurrentTenant() tenantId: string, @Body() body: any) {
    return this.funnelsService.create(tenantId, body);
  }

  @Get()
  @RequirePermissions('funnels:read')
  @ApiOperation({ summary: 'List funnels' })
  async list(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.funnelsService.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('funnels:read')
  @ApiOperation({ summary: 'Get funnel with pages' })
  @ApiParam({ name: 'id', description: 'Funnel ID' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.funnelsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('funnels:update')
  @ApiOperation({ summary: 'Update funnel' })
  @ApiParam({ name: 'id', description: 'Funnel ID' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.funnelsService.update(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('funnels:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete funnel' })
  @ApiParam({ name: 'id', description: 'Funnel ID' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.funnelsService.delete(tenantId, id);
  }

  @Post(':id/pages')
  @RequirePermissions('funnels:create')
  @ApiOperation({ summary: 'Add a page to a funnel' })
  @ApiParam({ name: 'id', description: 'Funnel ID' })
  async addPage(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') funnelId: string,
    @Body() body: any,
  ) {
    return this.funnelsService.addPage(tenantId, funnelId, user.sub, body);
  }

  @Patch('pages/:pageId')
  @RequirePermissions('funnels:update')
  @ApiOperation({ summary: 'Update a funnel page' })
  @ApiParam({ name: 'pageId', description: 'Page ID' })
  async updatePage(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('pageId') pageId: string,
    @Body() body: any,
  ) {
    return this.funnelsService.updatePage(tenantId, pageId, user.sub, body);
  }
}
