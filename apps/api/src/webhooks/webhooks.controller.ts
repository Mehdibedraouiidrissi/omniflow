import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Webhooks')
@ApiBearerAuth('access-token')
@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post()
  @RequirePermissions('integrations:create')
  @ApiOperation({ summary: 'Create a webhook subscription' })
  @ApiResponse({ status: 201, description: 'Webhook created' })
  async create(@CurrentTenant() tenantId: string, @Body() body: any) {
    return this.webhooksService.create(tenantId, body);
  }

  @Get()
  @RequirePermissions('integrations:read')
  @ApiOperation({ summary: 'List webhook subscriptions' })
  @ApiResponse({ status: 200, description: 'Webhooks list' })
  async list(@CurrentTenant() tenantId: string) {
    return this.webhooksService.list(tenantId);
  }

  @Get(':id')
  @RequirePermissions('integrations:read')
  @ApiOperation({ summary: 'Get webhook details' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Webhook details' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.webhooksService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('integrations:update')
  @ApiOperation({ summary: 'Update a webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Webhook updated' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.webhooksService.update(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('integrations:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 204, description: 'Webhook deleted' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.webhooksService.delete(tenantId, id);
  }

  @Get(':id/deliveries')
  @RequirePermissions('integrations:read')
  @ApiOperation({ summary: 'List webhook delivery attempts' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Deliveries list' })
  async listDeliveries(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Query() query: Record<string, string>,
  ) {
    return this.webhooksService.listDeliveries(tenantId, id, query);
  }

  @Post(':id/deliveries/:deliveryId/retry')
  @RequirePermissions('integrations:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed webhook delivery' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiParam({ name: 'deliveryId', description: 'Delivery ID' })
  @ApiResponse({ status: 200, description: 'Retry queued' })
  async retryDelivery(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.webhooksService.retryDelivery(tenantId, id, deliveryId);
  }
}
