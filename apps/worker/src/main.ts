// ============================================================================
// Omniflow Worker - Entry Point
// Background job processor for Omniflow
// ============================================================================

import http from 'http';
import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { logger } from './logger';

// Worker factories
import { createEmailWorker } from './workers/email.worker';
import { createSmsWorker } from './workers/sms.worker';
import { createWorkflowWorker } from './workers/workflow.worker';
import { createWebhookDeliveryWorker } from './workers/webhook-delivery.worker';
import { createSocialWorker } from './workers/social.worker';
import { createReminderWorker } from './workers/reminder.worker';
import { createReportWorker } from './workers/report.worker';
import { createImportWorker } from './workers/import.worker';
import { createBillingWorker } from './workers/billing.worker';

// Services
import { closeEmailTransport } from './services/email-transport';

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------

const prisma = new PrismaClient();
const workers: Array<{ close: () => Promise<void> }> = [];
let healthServer: http.Server | null = null;
let isShuttingDown = false;

// ---------------------------------------------------------------------------
// Redis connection config (shared by all workers)
// ---------------------------------------------------------------------------

function getRedisConnection() {
  // Parse REDIS_URL if available, else use individual host/port/password
  if (config.redisUrl && config.redisUrl !== 'redis://localhost:6379') {
    try {
      const url = new URL(config.redisUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port, 10) || 6379,
        password: url.password || undefined,
      };
    } catch {
      // Fall through to individual config
    }
  }

  return {
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword || undefined,
  };
}

// ---------------------------------------------------------------------------
// Worker registration
// ---------------------------------------------------------------------------

function registerWorkers() {
  const connection = getRedisConnection();

  logger.info({ redisHost: connection.host, redisPort: connection.port }, 'Registering workers');

  workers.push(createEmailWorker(prisma, connection));
  logger.info('Registered: email worker');

  workers.push(createSmsWorker(prisma, connection));
  logger.info('Registered: sms worker');

  workers.push(createWorkflowWorker(prisma, connection));
  logger.info('Registered: workflow worker');

  workers.push(createWebhookDeliveryWorker(prisma, connection));
  logger.info('Registered: webhook-delivery worker');

  workers.push(createSocialWorker(prisma, connection));
  logger.info('Registered: social worker');

  workers.push(createReminderWorker(prisma, connection));
  logger.info('Registered: reminder worker');

  workers.push(createReportWorker(prisma, connection));
  logger.info('Registered: report worker');

  workers.push(createImportWorker(prisma, connection));
  logger.info('Registered: import worker');

  workers.push(createBillingWorker(prisma, connection));
  logger.info('Registered: billing worker');

  logger.info({ workerCount: workers.length }, 'All workers registered');
}

// ---------------------------------------------------------------------------
// Health check HTTP server
// ---------------------------------------------------------------------------

function startHealthServer() {
  healthServer = http.createServer((_req, res) => {
    if (isShuttingDown) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'shutting_down' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'omniflow-worker',
        workers: workers.length,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      }),
    );
  });

  healthServer.listen(config.healthPort, () => {
    logger.info({ port: config.healthPort }, 'Health check server listening');
  });
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Shutting down gracefully...');

  // 1. Close health server
  if (healthServer) {
    healthServer.close();
    logger.info('Health server closed');
  }

  // 2. Close all workers (stop processing new jobs, finish current)
  const closePromises = workers.map((w) =>
    w.close().catch((err) => {
      logger.error({ error: (err as Error).message }, 'Error closing worker');
    }),
  );
  await Promise.allSettled(closePromises);
  logger.info('All workers closed');

  // 3. Close email transport pool
  await closeEmailTransport();

  // 4. Disconnect Prisma
  await prisma.$disconnect();
  logger.info('Prisma disconnected');

  logger.info('Shutdown complete');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  logger.info(
    {
      nodeEnv: config.nodeEnv,
      healthPort: config.healthPort,
      concurrency: config.workerConcurrency,
    },
    'Starting Omniflow Worker service',
  );

  // Connect to database
  await prisma.$connect();
  logger.info('Prisma connected to database');

  // Register all queue workers
  registerWorkers();

  // Start health check endpoint
  startHealthServer();

  // Register shutdown handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.fatal({ error: error.message, stack: error.stack }, 'Uncaught exception');
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
  });

  logger.info('Omniflow Worker service is running. Waiting for jobs...');
}

main().catch((err) => {
  logger.fatal({ error: (err as Error).message }, 'Failed to start worker');
  process.exit(1);
});
