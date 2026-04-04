import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from '../common/interceptors/tenant-context.interceptor';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });

    this.setupSoftDeleteMiddleware();
    this.setupTenantIsolationMiddleware();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  private setupSoftDeleteMiddleware() {
    this.$use(async (params: any, next) => {
      const modelsWithSoftDelete = [
        'User',
        'Tenant',
        'Contact',
        'Pipeline',
        'Opportunity',
        'Conversation',
        'Form',
        'Workflow',
        'Funnel',
        'Page',
        'Course',
      ];

      if (!params.model || !modelsWithSoftDelete.includes(params.model)) {
        return next(params);
      }

      // Intercept find queries to exclude soft-deleted records
      if (params.action === 'findUnique' || params.action === 'findFirst') {
        params.action = params.action === 'findUnique' ? 'findFirst' : 'findFirst';
        params.args = params.args || {};
        if (params.args.where) {
          if (params.args.where.deletedAt === undefined) {
            params.args.where.deletedAt = null;
          }
        }
      }

      if (params.action === 'findMany') {
        params.args = params.args || {};
        if (params.args.where) {
          if (params.args.where.deletedAt === undefined) {
            params.args.where.deletedAt = null;
          }
        } else {
          params.args.where = { deletedAt: null };
        }
      }

      // Intercept delete to soft-delete
      if (params.action === 'delete') {
        params.action = 'update';
        params.args.data = { deletedAt: new Date() };
      }

      if (params.action === 'deleteMany') {
        params.action = 'updateMany';
        if (params.args.data !== undefined) {
          params.args.data.deletedAt = new Date();
        } else {
          params.args.data = { deletedAt: new Date() };
        }
      }

      return next(params);
    });
  }

  private setupTenantIsolationMiddleware() {
    this.$use(async (params: any, next) => {
      const tenantScopedModels = [
        'Contact',
        'Tag',
        'ContactTag',
        'ContactNote',
        'Task',
        'Activity',
        'CustomField',
        'CustomFieldValue',
        'Pipeline',
        'PipelineStage',
        'Opportunity',
        'Conversation',
        'Message',
        'MessageTemplate',
        'Form',
        'FormSubmission',
        'Calendar',
        'MeetingType',
        'Appointment',
        'Workflow',
        'WorkflowRun',
        'Product',
        'Price',
        'Order',
        'Subscription',
        'Invoice',
        'Payment',
        'Funnel',
        'Page',
        'Course',
        'SocialPost',
        'SocialAccount',
        'Report',
        'Webhook',
        'Notification',
      ];

      if (!params.model || !tenantScopedModels.includes(params.model)) {
        return next(params);
      }

      const tenantId = TenantContext.getTenantId();
      if (!tenantId) {
        return next(params);
      }

      // Inject tenantId into read queries
      if (['findUnique', 'findFirst', 'findMany', 'count', 'aggregate', 'groupBy'].includes(params.action)) {
        params.args = params.args || {};
        params.args.where = params.args.where || {};
        params.args.where.tenantId = tenantId;
      }

      // Inject tenantId into create
      if (params.action === 'create') {
        params.args = params.args || {};
        params.args.data = params.args.data || {};
        if (!params.args.data.tenantId) {
          params.args.data.tenantId = tenantId;
        }
      }

      if (params.action === 'createMany') {
        params.args = params.args || {};
        if (Array.isArray(params.args.data)) {
          params.args.data = params.args.data.map((d: Record<string, unknown>) => ({
            ...d,
            tenantId: d.tenantId || tenantId,
          }));
        }
      }

      // Inject tenantId into update/delete queries
      if (['update', 'updateMany', 'delete', 'deleteMany', 'upsert'].includes(params.action)) {
        params.args = params.args || {};
        if (params.args.where) {
          params.args.where.tenantId = tenantId;
        }
      }

      return next(params);
    });
  }
}
