import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CreateWorkflowDto, UpdateWorkflowDto, UpdateStepsDto, TestWorkflowDto } from './dto/workflow.dto';

@ApiTags('Workflows')
@ApiBearerAuth('access-token')
@Controller('workflows')
export class WorkflowsController {
  constructor(private workflowsService: WorkflowsService) {}

  @Post()
  @RequirePermissions('workflows:create')
  @ApiOperation({ summary: 'Create a workflow' })
  async create(@CurrentTenant() tenantId: string, @CurrentUser() user: JwtPayload, @Body() dto: CreateWorkflowDto) {
    return this.workflowsService.create(tenantId, user.sub, dto);
  }

  @Get()
  @RequirePermissions('workflows:read')
  @ApiOperation({ summary: 'List workflows with stats' })
  async list(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.workflowsService.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('workflows:read')
  @ApiOperation({ summary: 'Get workflow with versions and steps' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.workflowsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('workflows:update')
  @ApiOperation({ summary: 'Update workflow settings' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateWorkflowDto) {
    return this.workflowsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('workflows:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete workflow (soft delete)' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.workflowsService.delete(tenantId, id);
  }

  @Post(':id/activate')
  @RequirePermissions('workflows:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate workflow (publish current version)' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  async activate(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.workflowsService.activate(tenantId, id);
  }

  @Post(':id/deactivate')
  @RequirePermissions('workflows:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate workflow' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  async deactivate(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.workflowsService.deactivate(tenantId, id);
  }

  @Patch(':id/steps')
  @RequirePermissions('workflows:update')
  @ApiOperation({ summary: 'Update workflow steps (saves new version)' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  async updateSteps(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateStepsDto) {
    return this.workflowsService.updateSteps(tenantId, id, dto.steps);
  }

  @Get(':id/runs')
  @RequirePermissions('workflows:read')
  @ApiOperation({ summary: 'Get execution runs with status' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  async listRuns(@CurrentTenant() tenantId: string, @Param('id') id: string, @Query() query: Record<string, string>) {
    return this.workflowsService.listRuns(tenantId, id, query);
  }

  @Get(':id/runs/:runId')
  @RequirePermissions('workflows:read')
  @ApiOperation({ summary: 'Get run details with step results' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiParam({ name: 'runId', description: 'Run ID' })
  async getRunDetail(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('runId') runId: string,
  ) {
    return this.workflowsService.getRunDetail(tenantId, id, runId);
  }

  @Post(':id/test')
  @RequirePermissions('workflows:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test workflow with sample data' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  async test(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: TestWorkflowDto) {
    return this.workflowsService.testWorkflow(tenantId, id, dto.sampleData);
  }

  @Post(':id/enroll/:contactId')
  @RequirePermissions('workflows:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually enroll a contact' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiParam({ name: 'contactId', description: 'Contact ID' })
  async enroll(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    return this.workflowsService.enrollContact(tenantId, id, contactId);
  }

  @Get(':id/analytics')
  @RequirePermissions('workflows:read')
  @ApiOperation({ summary: 'Workflow performance stats' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  async getAnalytics(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.workflowsService.getAnalytics(tenantId, id);
  }
}
