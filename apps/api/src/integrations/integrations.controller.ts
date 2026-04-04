import {
  Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Integrations')
@ApiBearerAuth('access-token')
@Controller('integrations')
export class IntegrationsController {
  constructor(private integrationsService: IntegrationsService) {}

  @Get()
  @RequirePermissions('integrations:read')
  @ApiOperation({ summary: 'List available and connected integrations' })
  async list(@CurrentTenant() tenantId: string) {
    return this.integrationsService.list(tenantId);
  }

  @Post()
  @RequirePermissions('integrations:create')
  @ApiOperation({ summary: 'Connect a new integration' })
  async connect(@CurrentTenant() tenantId: string, @Body() body: any) {
    return this.integrationsService.connect(tenantId, body);
  }

  @Patch(':id')
  @RequirePermissions('integrations:update')
  @ApiOperation({ summary: 'Update integration config' })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  async updateConfig(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.integrationsService.updateConfig(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('integrations:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect an integration' })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  async disconnect(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.integrationsService.disconnect(tenantId, id);
  }

  @Get('api-keys')
  @RequirePermissions('integrations:read')
  @ApiOperation({ summary: 'List API keys for tenant' })
  async listApiKeys(@CurrentTenant() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.integrationsService.listApiKeys(tenantId, user.sub);
  }

  @Post('api-keys')
  @RequirePermissions('integrations:create')
  @ApiOperation({ summary: 'Create an API key' })
  async createApiKey(@CurrentTenant() tenantId: string, @CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.integrationsService.createApiKey(tenantId, user.sub, body);
  }

  @Delete('api-keys/:id')
  @RequirePermissions('integrations:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiParam({ name: 'id', description: 'API Key ID' })
  async revokeApiKey(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.integrationsService.revokeApiKey(tenantId, id);
  }

  @Get('api-keys/:id/usage')
  @RequirePermissions('integrations:read')
  @ApiOperation({ summary: 'API key usage stats' })
  @ApiParam({ name: 'id', description: 'API Key ID' })
  async getApiKeyUsage(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.integrationsService.getApiKeyUsage(tenantId, id);
  }
}
