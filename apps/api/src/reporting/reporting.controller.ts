import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportingService } from './reporting.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Reporting')
@ApiBearerAuth('access-token')
@Controller('reports')
export class ReportingController {
  constructor(private reportingService: ReportingService) {}

  @Get('dashboard')
  @RequirePermissions('reporting:read')
  @ApiOperation({ summary: 'Main dashboard KPIs' })
  async getDashboard(@CurrentTenant() tenantId: string) {
    return this.reportingService.getDashboardStats(tenantId);
  }

  @Get('contacts')
  @RequirePermissions('reporting:read')
  @ApiOperation({ summary: 'Contact analytics (growth, sources, segments)' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d'] })
  async getContactsReport(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.reportingService.getContactsReport(tenantId, query);
  }

  @Get('pipelines')
  @RequirePermissions('reporting:read')
  @ApiOperation({ summary: 'Pipeline revenue (by stage, by period)' })
  @ApiQuery({ name: 'pipelineId', required: false })
  async getPipelineReport(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.reportingService.getPipelineReport(tenantId, query);
  }

  @Get('conversations')
  @RequirePermissions('reporting:read')
  @ApiOperation({ summary: 'Messaging metrics' })
  async getConversationStats(@CurrentTenant() tenantId: string) {
    return this.reportingService.getConversationStats(tenantId);
  }

  @Get('appointments')
  @RequirePermissions('reporting:read')
  @ApiOperation({ summary: 'Booking metrics' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d'] })
  async getAppointmentStats(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.reportingService.getAppointmentStats(tenantId, query);
  }

  @Get('payments')
  @RequirePermissions('reporting:read')
  @ApiOperation({ summary: 'Payment/revenue metrics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getPaymentStats(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.reportingService.getPaymentStats(tenantId, query);
  }

  @Get('workflows')
  @RequirePermissions('reporting:read')
  @ApiOperation({ summary: 'Workflow performance' })
  async getWorkflowStats(@CurrentTenant() tenantId: string) {
    return this.reportingService.getWorkflowStats(tenantId);
  }

  @Get('emails')
  @RequirePermissions('reporting:read')
  @ApiOperation({ summary: 'Email delivery metrics' })
  async getEmailStats(@CurrentTenant() tenantId: string) {
    return this.reportingService.getEmailStats(tenantId);
  }

  @Get('attribution')
  @RequirePermissions('reporting:read')
  @ApiOperation({ summary: 'Source attribution' })
  async getAttributionReport(@CurrentTenant() tenantId: string) {
    return this.reportingService.getAttributionReport(tenantId);
  }

  @Post('export')
  @RequirePermissions('reporting:read')
  @ApiOperation({ summary: 'Export report as CSV' })
  async exportReport(
    @CurrentTenant() tenantId: string,
    @Body() body: { reportType: string; filters?: Record<string, string> },
  ) {
    return this.reportingService.exportReport(tenantId, body.reportType, body.filters);
  }
}
