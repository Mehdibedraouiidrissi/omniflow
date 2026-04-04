import {
  Controller, Get, Post, Patch, Param, Query, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants with usage' })
  async listTenants(@Query() query: Record<string, string>) {
    return this.adminService.listAllTenants(query);
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Get tenant detail' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  async getTenantDetail(@Param('id') id: string) {
    return this.adminService.getTenantDetail(id);
  }

  @Patch('tenants/:id')
  @ApiOperation({ summary: 'Update tenant (suspend, change plan)' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  async updateTenant(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateTenant(id, body);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  async listUsers(@Query() query: Record<string, string>) {
    return this.adminService.listAllUsers(query);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Platform-wide metrics' })
  async getMetrics() {
    return this.adminService.getSystemMetrics();
  }

  @Get('health')
  @ApiOperation({ summary: 'System health (DB, Redis, queues)' })
  async getHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Platform audit logs' })
  async getAuditLogs(@Query() query: Record<string, string>) {
    return this.adminService.getAuditLogs(query);
  }

  @Get('feature-flags')
  @ApiOperation({ summary: 'List feature flags' })
  async listFeatureFlags() {
    return this.adminService.listFeatureFlags();
  }

  @Patch('feature-flags/:id')
  @ApiOperation({ summary: 'Toggle feature flag' })
  @ApiParam({ name: 'id', description: 'Feature Flag ID' })
  async toggleFeatureFlag(@Param('id') id: string, @Body('isEnabled') isEnabled: boolean) {
    return this.adminService.toggleFeatureFlag(id, isEnabled);
  }

  @Post('tenants/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  async suspendTenant(@Param('id') id: string) {
    return this.adminService.suspendTenant(id);
  }

  @Post('tenants/:id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  async activateTenant(@Param('id') id: string) {
    return this.adminService.activateTenant(id);
  }

  @Post('impersonate/:tenantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Impersonate a tenant (super admin only)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID to impersonate' })
  async impersonate(@CurrentUser() user: JwtPayload, @Param('tenantId') tenantId: string) {
    return this.adminService.impersonateTenant(user.sub, tenantId);
  }
}
