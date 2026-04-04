import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, JobOptions } from 'bull';

export interface QueueJobData {
  type: string;
  payload: Record<string, unknown>;
  tenantId?: string;
  userId?: string;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private queues = new Map<string, Queue>();

  registerQueue(name: string, queue: Queue) {
    this.queues.set(name, queue);
  }

  async addJob(
    queueName: string,
    jobName: string,
    data: QueueJobData,
    options?: JobOptions,
  ): Promise<string> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      this.logger.warn(`Queue '${queueName}' not registered, skipping job`);
      return 'skipped';
    }

    const job = await queue.add(jobName, data, {
      removeOnComplete: 100,
      removeOnFail: 200,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      ...options,
    });

    this.logger.log(`Job '${jobName}' added to queue '${queueName}': ${job.id}`);
    return String(job.id);
  }

  async addDelayedJob(
    queueName: string,
    jobName: string,
    data: QueueJobData,
    delayMs: number,
  ): Promise<string> {
    return this.addJob(queueName, jobName, data, { delay: delayMs });
  }

  async addScheduledJob(
    queueName: string,
    jobName: string,
    data: QueueJobData,
    cron: string,
  ): Promise<string> {
    return this.addJob(queueName, jobName, data, {
      repeat: { cron },
    });
  }
}
