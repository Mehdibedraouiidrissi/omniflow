import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private prisma: PrismaService) {}

  async getTenantBilling(tenantId: string) {
    const billing = await this.prisma.tenantBilling.findUnique({
      where: { tenantId },
      include: {
        billingPlan: true,
      },
    });

    if (!billing) {
      throw new NotFoundException('No billing record found for this tenant');
    }

    return billing;
  }

  async listPlans() {
    return this.prisma.billingPlan.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
    });
  }

  async changePlan(tenantId: string, planId: string) {
    const plan = await this.prisma.billingPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    return this.prisma.tenantBilling.upsert({
      where: { tenantId },
      update: { billingPlanId: planId },
      create: {
        tenantId,
        billingPlanId: planId,
        status: 'ACTIVE',
      },
      include: { billingPlan: true },
    });
  }

  async recordUsage(tenantId: string, metric: string, quantity: number) {
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM

    return this.prisma.usageRecord.upsert({
      where: { tenantId_metric_period: { tenantId, metric: metric as any, period } },
      update: { quantity: { increment: quantity } },
      create: {
        tenantId,
        metric: metric as any,
        quantity,
        period,
      },
    });
  }

  async getUsage(tenantId: string, period?: string) {
    const targetPeriod = period || new Date().toISOString().slice(0, 7);

    return this.prisma.usageRecord.findMany({
      where: { tenantId, period: targetPeriod },
    });
  }

  async checkEntitlement(tenantId: string, feature: string): Promise<boolean> {
    const entitlement = await this.prisma.featureEntitlement.findUnique({
      where: { tenantId_feature: { tenantId, feature } },
    });

    if (!entitlement) return false;
    if (!entitlement.enabled) return false;
    if (entitlement.limit != null && entitlement.used >= entitlement.limit) return false;

    return true;
  }

  async incrementUsage(tenantId: string, feature: string) {
    const entitlement = await this.prisma.featureEntitlement.findUnique({
      where: { tenantId_feature: { tenantId, feature } },
    });

    if (!entitlement || !entitlement.enabled) {
      throw new BadRequestException(`Feature '${feature}' is not available for this tenant`);
    }

    if (entitlement.limit != null && entitlement.used >= entitlement.limit) {
      throw new BadRequestException(`Usage limit reached for feature '${feature}'`);
    }

    return this.prisma.featureEntitlement.update({
      where: { tenantId_feature: { tenantId, feature } },
      data: { used: { increment: 1 } },
    });
  }

  async setEntitlement(tenantId: string, feature: string, enabled: boolean, limit?: number) {
    return this.prisma.featureEntitlement.upsert({
      where: { tenantId_feature: { tenantId, feature } },
      update: { enabled, limit },
      create: { tenantId, feature, enabled, limit },
    });
  }
}
