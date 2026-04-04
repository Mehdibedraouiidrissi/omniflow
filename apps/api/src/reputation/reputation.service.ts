import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/services/email.service';
import { SmsService } from '../common/services/sms.service';
import { parsePagination, buildPaginatedResponse } from '../common/pipes/parse-pagination.pipe';

@Injectable()
export class ReputationService {
  private readonly logger = new Logger(ReputationService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private smsService: SmsService,
  ) {}

  // --- Review Campaigns ---

  async createCampaign(tenantId: string, data: {
    name: string;
    templateId?: string;
    redirectUrl?: string;
  }) {
    return this.prisma.reviewCampaign.create({
      data: {
        tenantId,
        name: data.name,
        templateId: data.templateId,
        redirectUrl: data.redirectUrl,
        status: 'ACTIVE',
      },
    });
  }

  async listCampaigns(tenantId: string, query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = { tenantId };
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.reviewCampaign.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { requests: true } } },
      }),
      this.prisma.reviewCampaign.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async updateCampaign(tenantId: string, id: string, data: {
    name?: string;
    status?: string;
    redirectUrl?: string;
    templateId?: string;
  }) {
    const campaign = await this.prisma.reviewCampaign.findFirst({ where: { id, tenantId } });
    if (!campaign) throw new NotFoundException('Review campaign not found');

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.redirectUrl !== undefined) updateData.redirectUrl = data.redirectUrl;
    if (data.templateId !== undefined) updateData.templateId = data.templateId;

    return this.prisma.reviewCampaign.update({
      where: { id },
      data: updateData,
    });
  }

  async sendReviewRequests(
    tenantId: string,
    campaignId: string,
    contactIds: string[],
    channel: string = 'email',
  ) {
    const campaign = await this.prisma.reviewCampaign.findFirst({ where: { id: campaignId, tenantId } });
    if (!campaign) throw new NotFoundException('Review campaign not found');

    const contacts = await this.prisma.contact.findMany({
      where: { id: { in: contactIds }, tenantId, deletedAt: null },
    });

    const results: Array<{ contactId: string; status: string }> = [];

    for (const contact of contacts) {
      const request = await this.prisma.reviewRequest.create({
        data: {
          tenantId,
          campaignId,
          contactId: contact.id,
          channel,
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      try {
        const reviewLink = `${process.env.APP_URL || 'http://localhost:3000'}/review/${request.id}`;

        if (channel === 'sms' && contact.phone) {
          await this.smsService.sendSms({
            to: contact.phone,
            body: `Hi ${contact.firstName || 'there'}, we'd love your feedback! Please leave us a review: ${reviewLink}`,
          });
        } else if (contact.email) {
          await this.emailService.sendEmail({
            to: contact.email,
            subject: 'We\'d love your feedback!',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>How was your experience?</h2>
                <p>Hi ${contact.firstName || 'there'},</p>
                <p>We value your opinion and would love to hear about your experience.</p>
                <a href="${reviewLink}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Leave a Review</a>
              </div>`,
          });
        }

        results.push({ contactId: contact.id, status: 'sent' });
      } catch (error) {
        this.logger.error(`Failed to send review request to ${contact.id}: ${error}`);
        results.push({ contactId: contact.id, status: 'failed' });
      }
    }

    // Update campaign sent count
    await this.prisma.reviewCampaign.update({
      where: { id: campaignId },
      data: { sentCount: { increment: contacts.length } },
    });

    return { sent: results.filter((r) => r.status === 'sent').length, failed: results.filter((r) => r.status === 'failed').length, results };
  }

  async getCampaignResults(tenantId: string, campaignId: string) {
    const campaign = await this.prisma.reviewCampaign.findFirst({ where: { id: campaignId, tenantId } });
    if (!campaign) throw new NotFoundException('Review campaign not found');

    const requests = await this.prisma.reviewRequest.findMany({
      where: { campaignId, tenantId },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalSent = requests.length;
    const responded = requests.filter((r) => r.status === 'RESPONDED').length;
    const avgRating = requests
      .filter((r) => r.rating != null)
      .reduce((sum, r) => sum + (r.rating || 0), 0) / (responded || 1);

    return {
      campaign,
      stats: {
        totalSent,
        responded,
        responseRate: totalSent > 0 ? ((responded / totalSent) * 100).toFixed(1) : '0',
        averageRating: Number(avgRating.toFixed(1)),
      },
      requests,
    };
  }

  // --- Reviews ---

  async listReviews(tenantId: string, query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = { tenantId };

    if (query.platform) where.platform = query.platform;
    if (query.minRating) where.rating = { gte: parseInt(query.minRating, 10) };

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async respondToReview(tenantId: string, reviewId: string, response: string) {
    const review = await this.prisma.review.findFirst({ where: { id: reviewId, tenantId } });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { response, respondedAt: new Date() },
    });
  }

  // --- Public: Submit review response ---

  async submitReviewResponse(requestId: string, data: { rating: number; feedback?: string }) {
    const request = await this.prisma.reviewRequest.findUnique({
      where: { id: requestId },
      include: { campaign: true },
    });

    if (!request) throw new NotFoundException('Review request not found');

    // Update the request with the response
    await this.prisma.reviewRequest.update({
      where: { id: requestId },
      data: {
        status: 'RESPONDED',
        rating: data.rating,
        feedback: data.feedback,
        respondedAt: new Date(),
      },
    });

    // Update campaign counters
    await this.prisma.reviewCampaign.update({
      where: { id: request.campaignId },
      data: {
        responseCount: { increment: 1 },
        ...(data.rating >= 4 ? { positiveCount: { increment: 1 } } : {}),
      },
    });

    // Create a Review record
    await this.prisma.review.create({
      data: {
        tenantId: request.tenantId,
        contactId: request.contactId,
        platform: 'internal',
        rating: data.rating,
        body: data.feedback,
      },
    });

    // Redirect logic: positive reviews go to external platform
    const redirectUrl = data.rating >= 4 && request.campaign.redirectUrl
      ? request.campaign.redirectUrl
      : null;

    return {
      message: 'Thank you for your feedback!',
      redirectUrl,
    };
  }

  // --- Reputation Stats ---

  async getReputationStats(tenantId: string) {
    const [totalReviews, avgRating, ratingDistribution, recentReviews] = await Promise.all([
      this.prisma.review.count({ where: { tenantId } }),
      this.prisma.review.aggregate({
        where: { tenantId },
        _avg: { rating: true },
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { tenantId },
        _count: true,
        orderBy: { rating: 'asc' },
      }),
      this.prisma.review.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    const campaignStats = await this.prisma.reviewCampaign.aggregate({
      where: { tenantId },
      _sum: { sentCount: true, responseCount: true, positiveCount: true },
    });

    return {
      totalReviews,
      averageRating: Number((avgRating._avg.rating || 0).toFixed(1)),
      ratingDistribution: ratingDistribution.map((r) => ({
        rating: r.rating,
        count: r._count,
      })),
      campaigns: {
        totalSent: campaignStats._sum.sentCount || 0,
        totalResponses: campaignStats._sum.responseCount || 0,
        totalPositive: campaignStats._sum.positiveCount || 0,
      },
      recentReviews,
    };
  }
}
