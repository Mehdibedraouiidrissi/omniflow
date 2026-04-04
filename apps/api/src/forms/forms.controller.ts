import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { FormsService } from './forms.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CreateFormDto, UpdateFormDto, SubmitFormDto } from './dto/form.dto';

@ApiTags('Forms')
@ApiBearerAuth('access-token')
@Controller('forms')
export class FormsController {
  constructor(private formsService: FormsService) {}

  @Post()
  @RequirePermissions('forms:create')
  @ApiOperation({ summary: 'Create a new form' })
  @ApiResponse({ status: 201, description: 'Form created' })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateFormDto) {
    return this.formsService.create(tenantId, dto);
  }

  @Get()
  @RequirePermissions('forms:read')
  @ApiOperation({ summary: 'List forms with submission counts' })
  async list(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.formsService.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('forms:read')
  @ApiOperation({ summary: 'Get form with fields' })
  @ApiParam({ name: 'id', description: 'Form ID' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.formsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('forms:update')
  @ApiOperation({ summary: 'Update form' })
  @ApiParam({ name: 'id', description: 'Form ID' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateFormDto) {
    return this.formsService.update(tenantId, id, dto as any);
  }

  @Delete(':id')
  @RequirePermissions('forms:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete form (soft delete)' })
  @ApiParam({ name: 'id', description: 'Form ID' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.formsService.delete(tenantId, id);
  }

  @Post(':id/publish')
  @RequirePermissions('forms:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish form' })
  @ApiParam({ name: 'id', description: 'Form ID' })
  async publish(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.formsService.publish(tenantId, id);
  }

  @Post(':id/archive')
  @RequirePermissions('forms:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive form' })
  @ApiParam({ name: 'id', description: 'Form ID' })
  async archive(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.formsService.archive(tenantId, id);
  }

  @Public()
  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a form (public endpoint)' })
  @ApiParam({ name: 'id', description: 'Form ID' })
  async submit(
    @Param('id') formId: string,
    @Body() body: { tenantId: string; data: Record<string, unknown>; contactId?: string },
    @Req() req: Request,
  ) {
    return this.formsService.submitForm(
      body.tenantId,
      formId,
      body.data,
      body.contactId,
      req.ip,
      req.headers['user-agent'] as string,
    );
  }

  @Get(':id/submissions')
  @RequirePermissions('forms:read')
  @ApiOperation({ summary: 'Get form submissions with pagination' })
  @ApiParam({ name: 'id', description: 'Form ID' })
  async listSubmissions(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Query() query: Record<string, string>,
  ) {
    return this.formsService.listSubmissions(tenantId, id, query);
  }

  @Get(':id/submissions/:subId')
  @RequirePermissions('forms:read')
  @ApiOperation({ summary: 'Get submission detail' })
  @ApiParam({ name: 'id', description: 'Form ID' })
  @ApiParam({ name: 'subId', description: 'Submission ID' })
  async getSubmission(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('subId') subId: string,
  ) {
    return this.formsService.getSubmission(tenantId, id, subId);
  }

  @Get(':id/analytics')
  @RequirePermissions('forms:read')
  @ApiOperation({ summary: 'Form submission analytics' })
  @ApiParam({ name: 'id', description: 'Form ID' })
  async getAnalytics(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.formsService.getAnalytics(tenantId, id);
  }
}
