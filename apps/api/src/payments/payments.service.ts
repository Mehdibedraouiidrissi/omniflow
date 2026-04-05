import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { parsePagination, buildPaginatedResponse } from '../common/pipes/parse-pagination.pipe';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' as any });
    }
  }

  // --- Products ---

  async createProduct(tenantId: string, data: {
    name: string;
    description?: string;
    type: string;
    prices: Array<{ amount: number; currency?: string; interval?: string }>;
  }) {
    let stripeProductId: string | undefined;

    if (this.stripe) {
      const stripeProduct = await this.stripe.products.create({
        name: data.name,
        description: data.description,
        metadata: { tenantId },
      });
      stripeProductId = stripeProduct.id;
    }

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        type: data.type as any,
        status: 'ACTIVE',
        stripeProductId,
      },
    });

    for (const priceData of data.prices) {
      let stripePriceId: string | undefined;

      if (this.stripe && stripeProductId) {
        const stripePrice = await this.stripe.prices.create({
          product: stripeProductId,
          unit_amount: Math.round(priceData.amount * 100),
          currency: priceData.currency || 'usd',
          ...(priceData.interval ? { recurring: { interval: priceData.interval as any } } : {}),
          metadata: { tenantId },
        });
        stripePriceId = stripePrice.id;
      }

      await this.prisma.price.create({
        data: {
          tenantId,
          productId: product.id,
          amount: Math.round(priceData.amount * 100),
          currency: priceData.currency || 'usd',
          type: priceData.interval ? 'RECURRING' : 'ONE_TIME',
          interval: priceData.interval as any,
          isActive: true,
          stripePriceId,
        },
      });
    }

    return this.prisma.product.findUnique({
      where: { id: product.id },
      include: { prices: true },
    });
  }

  async listProducts(tenantId: string, query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = { tenantId };

    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { [params.sortBy]: params.sortOrder },
        include: { prices: { where: { isActive: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findProduct(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: { prices: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async updateProduct(tenantId: string, id: string, data: { name?: string; description?: string; status?: string }) {
    const product = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.product.update({ where: { id }, data: data as any, include: { prices: true } });
  }

  async archiveProduct(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  async addPrice(tenantId: string, productId: string, data: { amount: number; currency?: string; interval?: string }) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    let stripePriceId: string | undefined;
    if (this.stripe && product.stripeProductId) {
      const stripePrice = await this.stripe.prices.create({
        product: product.stripeProductId,
        unit_amount: Math.round(data.amount * 100),
        currency: data.currency || 'usd',
        ...(data.interval ? { recurring: { interval: data.interval as any } } : {}),
        metadata: { tenantId },
      });
      stripePriceId = stripePrice.id;
    }

    return this.prisma.price.create({
      data: {
        tenantId,
        productId,
        amount: Math.round(data.amount * 100),
        currency: data.currency || 'usd',
        type: data.interval ? 'RECURRING' : 'ONE_TIME',
        interval: data.interval as any,
        isActive: true,
        stripePriceId,
      },
    });
  }

  async updatePrice(tenantId: string, priceId: string, data: { isActive?: boolean; name?: string }) {
    const price = await this.prisma.price.findFirst({ where: { id: priceId, tenantId } });
    if (!price) throw new NotFoundException('Price not found');

    return this.prisma.price.update({ where: { id: priceId }, data });
  }

  // --- Checkout ---

  async createCheckout(tenantId: string, data: {
    productId: string;
    priceId: string;
    contactId?: string;
    successUrl?: string;
    cancelUrl?: string;
  }) {
    return this.prisma.checkout.create({
      data: {
        tenantId,
        productId: data.productId,
        priceId: data.priceId,
        contactId: data.contactId,
        status: 'PENDING',
        sessionData: {
          successUrl: data.successUrl,
          cancelUrl: data.cancelUrl,
        } as any,
      },
    });
  }

  // --- Orders ---

  async listOrders(tenantId: string, query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = { tenantId };

    if (query.status) where.status = query.status;
    if (query.contactId) where.contactId = query.contactId;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findOrder(tenantId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        payments: true,
        invoices: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // --- Subscriptions ---

  async listSubscriptions(tenantId: string, query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = { tenantId };

    if (query.status) where.status = query.status;
    if (query.contactId) where.contactId = query.contactId;

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          product: { select: { id: true, name: true } },
          price: { select: { id: true, amount: true, interval: true } },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findSubscription(tenantId: string, id: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, tenantId },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        product: true,
        price: true,
      },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  async cancelSubscription(tenantId: string, id: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { id, tenantId } });
    if (!sub) throw new NotFoundException('Subscription not found');

    if (this.stripe && sub.stripeSubscriptionId) {
      await this.stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    }

    return this.prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
  }

  // --- Invoices ---

  async listInvoices(tenantId: string, query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = { tenantId };

    if (query.status) where.status = query.status;
    if (query.contactId) where.contactId = query.contactId;

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findInvoice(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        payments: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async sendInvoice(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { contact: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    // Mark as open
    await this.prisma.invoice.update({
      where: { id },
      data: { status: 'OPEN' },
    });

    return { message: 'Invoice sent', invoiceId: id };
  }

  // --- Payments ---

  async listPayments(tenantId: string, query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = { tenantId };

    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { refunds: true } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async refundPayment(tenantId: string, paymentId: string, data?: { amount?: number; reason?: string }) {
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, tenantId } });
    if (!payment) throw new NotFoundException('Payment not found');

    const refundAmount = data?.amount || payment.amount;

    if (this.stripe && payment.stripePaymentId) {
      await this.stripe.refunds.create({
        payment_intent: payment.stripePaymentId,
        amount: data?.amount ? Math.round(data.amount * 100) : undefined,
        reason: (data?.reason as any) || 'requested_by_customer',
      });
    }

    return this.prisma.refund.create({
      data: {
        tenantId,
        paymentId,
        amount: refundAmount,
        reason: data?.reason,
        status: 'SUCCEEDED',
      },
    });
  }

  // --- Coupons ---

  async createCoupon(tenantId: string, data: {
    code: string;
    name?: string;
    type: string;
    value: number;
    maxRedemptions?: number;
    expiresAt?: string;
  }) {
    return this.prisma.coupon.create({
      data: {
        tenantId,
        code: data.code.toUpperCase(),
        name: data.name,
        type: data.type as any,
        value: data.value,
        maxRedemptions: data.maxRedemptions,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });
  }

  async listCoupons(tenantId: string, query: Record<string, string>) {
    const params = parsePagination(query);

    const [data, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where: { tenantId },
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count({ where: { tenantId } }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  // --- Revenue Stats ---

  async getRevenueStats(tenantId: string, query: Record<string, string>) {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const [revenue, orderCount, subscriptionRevenue, activeSubscriptions] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { tenantId, status: 'SUCCEEDED', createdAt: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.order.count({
        where: { tenantId, status: 'PAID', createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.subscription.aggregate({
        where: { tenantId, status: 'ACTIVE' },
        _count: true,
      }),
      this.prisma.subscription.count({ where: { tenantId, status: 'ACTIVE' } }),
    ]);

    return {
      totalRevenue: revenue._sum.amount || 0,
      paymentCount: revenue._count,
      orderCount,
      activeSubscriptions,
      mrr: subscriptionRevenue._count, // simplified
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
    };
  }

  // --- Stripe Webhook ---

  async handleStripeWebhook(payload: Buffer, signature: string) {
    if (!this.stripe) {
      this.logger.warn('Stripe not configured, skipping webhook');
      return;
    }

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');
    const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'charge.refunded':
        this.logger.log(`Charge refunded: ${(event.data.object as any).id}`);
        break;
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(`Payment succeeded: ${paymentIntent.id}`);
    const tenantId = paymentIntent.metadata?.tenantId;
    if (!tenantId) return;

    // Update order if exists
    await this.prisma.order.updateMany({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    this.logger.log(`Invoice paid: ${invoice.id}`);
    await this.prisma.invoice.updateMany({
      where: { stripeInvoiceId: invoice.id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  private async handleInvoiceFailed(invoice: Stripe.Invoice) {
    this.logger.log(`Invoice failed: ${invoice.id}`);
    await this.prisma.invoice.updateMany({
      where: { stripeInvoiceId: invoice.id },
      data: { status: 'UNCOLLECTIBLE' },
    });
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    this.logger.log(`Subscription created: ${subscription.id}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    this.logger.log(`Subscription updated: ${subscription.id}`);
    const statusMap: Record<string, string> = {
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELLED',
      trialing: 'TRIALING',
      paused: 'PAUSED',
    };

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: (statusMap[subscription.status] || 'ACTIVE') as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    this.logger.log(`Subscription deleted: ${subscription.id}`);
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
  }
}
