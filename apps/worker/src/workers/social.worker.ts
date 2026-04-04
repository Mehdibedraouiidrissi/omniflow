// ============================================================================
// Omniflow Worker - Social Post Publishing Worker
// Queue: 'social'
// ============================================================================

import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { createChildLogger } from '../logger';
import { config } from '../config';

const log = createChildLogger('social-worker');

// ---------------------------------------------------------------------------
// Job data interface
// ---------------------------------------------------------------------------

export interface SocialJobData {
  tenantId: string;
  postId: string;
  platforms: string[]; // e.g. ['FACEBOOK', 'INSTAGRAM', 'TWITTER', 'LINKEDIN', 'TIKTOK']
}

interface PlatformPublishResult {
  platform: string;
  success: boolean;
  externalId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Worker factory
// ---------------------------------------------------------------------------

export function createSocialWorker(
  prisma: PrismaClient,
  connection: { host: string; port: number; password?: string },
) {
  const worker = new Worker<SocialJobData>(
    'social',
    async (job: Job<SocialJobData>) => {
      const { tenantId, postId, platforms } = job.data;

      log.info({ jobId: job.id, postId, platforms, tenantId }, 'Processing social post publish');

      // ---- Load the post ----
      const post = await prisma.socialPost.findFirst({
        where: { id: postId, tenantId },
      });

      if (!post) {
        log.error({ postId }, 'Social post not found');
        return { status: 'error', reason: 'post_not_found' };
      }

      // Mark as publishing
      await prisma.socialPost.update({
        where: { id: postId },
        data: { status: 'PUBLISHING' },
      });

      // ---- Load social accounts for the tenant ----
      const accounts = await prisma.socialAccount.findMany({
        where: {
          tenantId,
          isActive: true,
          platform: { in: platforms as any[] },
        },
      });

      const results: PlatformPublishResult[] = [];

      // ---- Publish to each platform ----
      for (const platform of platforms) {
        const account = accounts.find((a) => a.platform === platform);

        if (!account) {
          results.push({
            platform,
            success: false,
            error: `No active ${platform} account found`,
          });
          continue;
        }

        try {
          const publishResult = await publishToPlatform(
            platform,
            account,
            post.content || '',
            post.mediaUrls as string[] | null,
          );

          results.push({
            platform,
            success: true,
            externalId: publishResult.externalId,
          });
        } catch (err) {
          const error = err as Error;
          log.error({ platform, postId, error: error.message }, 'Failed to publish to platform');
          results.push({
            platform,
            success: false,
            error: error.message,
          });
        }
      }

      // ---- Update post status ----
      const allSucceeded = results.every((r) => r.success);
      const anySucceeded = results.some((r) => r.success);

      await prisma.socialPost.update({
        where: { id: postId },
        data: {
          status: allSucceeded ? 'PUBLISHED' : anySucceeded ? 'PUBLISHED' : 'FAILED',
          publishedAt: anySucceeded ? new Date() : undefined,
          failedAt: !anySucceeded ? new Date() : undefined,
          failureReason: !anySucceeded
            ? results.map((r) => `${r.platform}: ${r.error}`).join('; ')
            : undefined,
          results: results as any,
        },
      });

      log.info(
        {
          postId,
          succeeded: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
        },
        'Social post publish completed',
      );

      return { status: allSucceeded ? 'published' : 'partial', results };
    },
    {
      connection,
      concurrency: 3,
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 1000 },
    },
  );

  worker.on('failed', (job, error) => {
    log.error(
      { jobId: job?.id, error: error.message },
      'Social post job failed',
    );
  });

  worker.on('error', (error) => {
    log.error({ error: error.message }, 'Social worker error');
  });

  return worker;
}

// ---------------------------------------------------------------------------
// Platform publishing stubs
// ---------------------------------------------------------------------------

async function publishToPlatform(
  platform: string,
  account: { accessToken: string | null; accountId: string },
  content: string,
  mediaUrls: string[] | null,
): Promise<{ externalId: string }> {
  // Stub implementations -- replace with actual API calls
  switch (platform) {
    case 'FACEBOOK':
      return publishToFacebook(account, content, mediaUrls);
    case 'INSTAGRAM':
      return publishToInstagram(account, content, mediaUrls);
    case 'TWITTER':
      return publishToTwitter(account, content, mediaUrls);
    case 'LINKEDIN':
      return publishToLinkedIn(account, content, mediaUrls);
    case 'TIKTOK':
      return publishToTikTok(account, content, mediaUrls);
    case 'GOOGLE':
      return publishToGoogleBusiness(account, content, mediaUrls);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

async function publishToFacebook(
  account: { accessToken: string | null; accountId: string },
  content: string,
  _mediaUrls: string[] | null,
): Promise<{ externalId: string }> {
  // TODO: Implement Facebook Graph API call
  // POST https://graph.facebook.com/{page-id}/feed
  log.info({ accountId: account.accountId }, 'Publishing to Facebook (stub)');
  return { externalId: `fb_${Date.now()}` };
}

async function publishToInstagram(
  account: { accessToken: string | null; accountId: string },
  content: string,
  _mediaUrls: string[] | null,
): Promise<{ externalId: string }> {
  // TODO: Implement Instagram Graph API call
  // Requires media container creation then publish
  log.info({ accountId: account.accountId }, 'Publishing to Instagram (stub)');
  return { externalId: `ig_${Date.now()}` };
}

async function publishToTwitter(
  account: { accessToken: string | null; accountId: string },
  content: string,
  _mediaUrls: string[] | null,
): Promise<{ externalId: string }> {
  // TODO: Implement Twitter/X API v2 call
  // POST https://api.twitter.com/2/tweets
  log.info({ accountId: account.accountId }, 'Publishing to Twitter (stub)');
  return { externalId: `tw_${Date.now()}` };
}

async function publishToLinkedIn(
  account: { accessToken: string | null; accountId: string },
  content: string,
  _mediaUrls: string[] | null,
): Promise<{ externalId: string }> {
  // TODO: Implement LinkedIn API call
  // POST https://api.linkedin.com/v2/ugcPosts
  log.info({ accountId: account.accountId }, 'Publishing to LinkedIn (stub)');
  return { externalId: `li_${Date.now()}` };
}

async function publishToTikTok(
  account: { accessToken: string | null; accountId: string },
  content: string,
  _mediaUrls: string[] | null,
): Promise<{ externalId: string }> {
  // TODO: Implement TikTok Content Publishing API
  log.info({ accountId: account.accountId }, 'Publishing to TikTok (stub)');
  return { externalId: `tt_${Date.now()}` };
}

async function publishToGoogleBusiness(
  account: { accessToken: string | null; accountId: string },
  content: string,
  _mediaUrls: string[] | null,
): Promise<{ externalId: string }> {
  // TODO: Implement Google Business Profile API call
  log.info({ accountId: account.accountId }, 'Publishing to Google Business (stub)');
  return { externalId: `gb_${Date.now()}` };
}
