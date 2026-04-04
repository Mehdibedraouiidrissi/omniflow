import {
  Controller, Get, Post, Patch, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ReputationService } from './reputation.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  CreateReviewCampaignDto,
  UpdateReviewCampaignDto,
  SendReviewRequestsDto,
  SubmitReviewDto,
  RespondToReviewDto,
} from './dto/create-review-campaign.dto';

@ApiTags('Reputation')
@ApiBearerAuth('access-token')
@Controller()
export class ReputationController {
  constructor(private reputationService: ReputationService) {}

  // --- Review Campaigns ---

  @Get('review-campaigns')
  @RequirePermissions('reputation:read')
  @ApiOperation({ summary: 'List review campaigns' })
  async listCampaigns(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.reputationService.listCampaigns(tenantId, query);
  }

  @Post('review-campaigns')
  @RequirePermissions('reputation:create')
  @ApiOperation({ summary: 'Create a review campaign' })
  async createCampaign(@CurrentTenant() tenantId: string, @Body() dto: CreateReviewCampaignDto) {
    return this.reputationService.createCampaign(tenantId, dto);
  }

  @Patch('review-campaigns/:id')
  @RequirePermissions('reputation:update')
  @ApiOperation({ summary: 'Update a review campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async updateCampaign(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReviewCampaignDto,
  ) {
    return this.reputationService.updateCampaign(tenantId, id, dto);
  }

  @Post('review-campaigns/:id/send')
  @RequirePermissions('reputation:create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send review requests to contacts' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async sendReviewRequests(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SendReviewRequestsDto,
  ) {
    return this.reputationService.sendReviewRequests(tenantId, id, dto.contactIds, dto.channel);
  }

  @Get('review-campaigns/:id/results')
  @RequirePermissions('reputation:read')
  @ApiOperation({ summary: 'Get campaign results' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async getCampaignResults(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.reputationService.getCampaignResults(tenantId, id);
  }

  // --- Reviews ---

  @Get('reviews')
  @RequirePermissions('reputation:read')
  @ApiOperation({ summary: 'List reviews' })
  async listReviews(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.reputationService.listReviews(tenantId, query);
  }

  @Post('reviews/:id/respond')
  @RequirePermissions('reputation:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Respond to a review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  async respondToReview(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: RespondToReviewDto,
  ) {
    return this.reputationService.respondToReview(tenantId, id, dto.response);
  }

  // --- Public: Submit review ---

  @Public()
  @Post('review-requests/:id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a review response (public)' })
  @ApiParam({ name: 'id', description: 'Review Request ID' })
  async submitReview(@Param('id') id: string, @Body() dto: SubmitReviewDto) {
    return this.reputationService.submitReviewResponse(id, dto);
  }

  // --- Stats ---

  @Get('reputation/stats')
  @RequirePermissions('reputation:read')
  @ApiOperation({ summary: 'Get overall reputation statistics' })
  async getStats(@CurrentTenant() tenantId: string) {
    return this.reputationService.getReputationStats(tenantId);
  }
}
