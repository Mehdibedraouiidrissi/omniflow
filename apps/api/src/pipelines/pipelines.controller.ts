import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PipelinesService } from './pipelines.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import {
  CreatePipelineDto, UpdatePipelineDto, CreateStageDto, UpdateStageDto,
  CreateOpportunityDto, UpdateOpportunityDto,
} from './dto/pipeline.dto';

@ApiTags('Pipelines')
@ApiBearerAuth('access-token')
@Controller('pipelines')
export class PipelinesController {
  constructor(private pipelinesService: PipelinesService) {}

  @Post()
  @RequirePermissions('pipelines:create')
  @ApiOperation({ summary: 'Create a new pipeline with stages' })
  @ApiResponse({ status: 201, description: 'Pipeline created' })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreatePipelineDto) {
    return this.pipelinesService.create(tenantId, dto);
  }

  @Get()
  @RequirePermissions('pipelines:read')
  @ApiOperation({ summary: 'List all pipelines with stage counts and totals' })
  async list(@CurrentTenant() tenantId: string) {
    return this.pipelinesService.list(tenantId);
  }

  @Get(':id')
  @RequirePermissions('pipelines:read')
  @ApiOperation({ summary: 'Get pipeline details with stages and stats' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.pipelinesService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('pipelines:update')
  @ApiOperation({ summary: 'Update pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdatePipelineDto) {
    return this.pipelinesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('pipelines:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete pipeline (soft delete)' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.pipelinesService.delete(tenantId, id);
  }

  // --- Stages ---

  @Post(':id/stages')
  @RequirePermissions('pipelines:update')
  @ApiOperation({ summary: 'Add a stage to a pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  async addStage(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: CreateStageDto) {
    return this.pipelinesService.addStage(tenantId, id, dto);
  }

  @Patch(':id/stages/:stageId')
  @RequirePermissions('pipelines:update')
  @ApiOperation({ summary: 'Update a stage' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiParam({ name: 'stageId', description: 'Stage ID' })
  async updateStage(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('stageId') stageId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.pipelinesService.updateStage(tenantId, id, stageId, dto);
  }

  @Delete(':id/stages/:stageId')
  @RequirePermissions('pipelines:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a stage' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiParam({ name: 'stageId', description: 'Stage ID' })
  async deleteStage(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('stageId') stageId: string,
  ) {
    await this.pipelinesService.deleteStage(tenantId, id, stageId);
  }

  // --- Report ---

  @Get(':id/report')
  @RequirePermissions('pipelines:read')
  @ApiOperation({ summary: 'Get pipeline performance metrics' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  async getPipelineReport(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.pipelinesService.getPipelineReport(tenantId, id);
  }
}

@ApiTags('Opportunities')
@ApiBearerAuth('access-token')
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private pipelinesService: PipelinesService) {}

  @Get()
  @RequirePermissions('pipelines:read')
  @ApiOperation({ summary: 'List opportunities with filters' })
  async list(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.pipelinesService.listOpportunities(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('pipelines:read')
  @ApiOperation({ summary: 'Get opportunity with contact, notes, tasks' })
  @ApiParam({ name: 'id', description: 'Opportunity ID' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.pipelinesService.findOpportunity(tenantId, id);
  }

  @Post()
  @RequirePermissions('pipelines:create')
  @ApiOperation({ summary: 'Create opportunity' })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateOpportunityDto) {
    return this.pipelinesService.createOpportunity(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('pipelines:update')
  @ApiOperation({ summary: 'Update opportunity (including stage move)' })
  @ApiParam({ name: 'id', description: 'Opportunity ID' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateOpportunityDto) {
    return this.pipelinesService.updateOpportunity(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('pipelines:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete opportunity (soft delete)' })
  @ApiParam({ name: 'id', description: 'Opportunity ID' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.pipelinesService.deleteOpportunity(tenantId, id);
  }

  @Post(':id/notes')
  @RequirePermissions('pipelines:update')
  @ApiOperation({ summary: 'Add note to opportunity' })
  @ApiParam({ name: 'id', description: 'Opportunity ID' })
  async addNote(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('content') content: string,
  ) {
    return this.pipelinesService.addOpportunityNote(tenantId, id, user.sub, content);
  }

  @Post(':id/tasks')
  @RequirePermissions('pipelines:update')
  @ApiOperation({ summary: 'Add task to opportunity' })
  @ApiParam({ name: 'id', description: 'Opportunity ID' })
  async addTask(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.pipelinesService.addOpportunityTask(tenantId, id, user.sub, body);
  }
}
