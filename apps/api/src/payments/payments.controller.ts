import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, RawBodyRequest, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  CreateProductDto, UpdateProductDto, CreatePriceDto, CreateCheckoutDto,
  CreateCouponDto, RefundDto,
} from './dto/payment.dto';

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@Controller()
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  // --- Products ---

  @Get('products')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'List products' })
  async listProducts(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.paymentsService.listProducts(tenantId, query);
  }

  @Get('products/:id')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'Get product with prices' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async findProduct(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.paymentsService.findProduct(tenantId, id);
  }

  @Post('products')
  @RequirePermissions('payments:create')
  @ApiOperation({ summary: 'Create product (syncs to Stripe)' })
  async createProduct(@CurrentTenant() tenantId: string, @Body() dto: CreateProductDto) {
    return this.paymentsService.createProduct(tenantId, dto);
  }

  @Patch('products/:id')
  @RequirePermissions('payments:update')
  @ApiOperation({ summary: 'Update product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async updateProduct(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.paymentsService.updateProduct(tenantId, id, dto);
  }

  @Delete('products/:id')
  @RequirePermissions('payments:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async archiveProduct(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.paymentsService.archiveProduct(tenantId, id);
  }

  @Post('products/:id/prices')
  @RequirePermissions('payments:create')
  @ApiOperation({ summary: 'Add price to product (syncs to Stripe)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async addPrice(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: CreatePriceDto) {
    return this.paymentsService.addPrice(tenantId, id, dto);
  }

  @Patch('prices/:id')
  @RequirePermissions('payments:update')
  @ApiOperation({ summary: 'Update price' })
  @ApiParam({ name: 'id', description: 'Price ID' })
  async updatePrice(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.paymentsService.updatePrice(tenantId, id, body);
  }

  // --- Checkout ---

  @Post('checkout')
  @RequirePermissions('payments:create')
  @ApiOperation({ summary: 'Create checkout session' })
  async createCheckout(@CurrentTenant() tenantId: string, @Body() dto: CreateCheckoutDto) {
    return this.paymentsService.createCheckout(tenantId, dto);
  }

  // --- Orders ---

  @Get('orders')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'List orders' })
  async listOrders(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.paymentsService.listOrders(tenantId, query);
  }

  @Get('orders/:id')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'Get order detail' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  async findOrder(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.paymentsService.findOrder(tenantId, id);
  }

  // --- Subscriptions ---

  @Get('subscriptions')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'List subscriptions' })
  async listSubscriptions(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.paymentsService.listSubscriptions(tenantId, query);
  }

  @Get('subscriptions/:id')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'Get subscription detail' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  async findSubscription(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.paymentsService.findSubscription(tenantId, id);
  }

  @Post('subscriptions/:id/cancel')
  @RequirePermissions('payments:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  async cancelSubscription(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.paymentsService.cancelSubscription(tenantId, id);
  }

  // --- Invoices ---

  @Get('invoices')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'List invoices' })
  async listInvoices(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.paymentsService.listInvoices(tenantId, query);
  }

  @Get('invoices/:id')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'Get invoice detail' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  async findInvoice(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.paymentsService.findInvoice(tenantId, id);
  }

  @Post('invoices/:id/send')
  @RequirePermissions('payments:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  async sendInvoice(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.paymentsService.sendInvoice(tenantId, id);
  }

  // --- Payments ---

  @Get('payments')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'List payments' })
  async listPayments(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.paymentsService.listPayments(tenantId, query);
  }

  @Post('payments/:id/refund')
  @RequirePermissions('payments:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refund payment' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  async refundPayment(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: RefundDto) {
    return this.paymentsService.refundPayment(tenantId, id, dto);
  }

  // --- Coupons ---

  @Post('coupons')
  @RequirePermissions('payments:create')
  @ApiOperation({ summary: 'Create coupon' })
  async createCoupon(@CurrentTenant() tenantId: string, @Body() dto: CreateCouponDto) {
    return this.paymentsService.createCoupon(tenantId, dto);
  }

  @Get('coupons')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'List coupons' })
  async listCoupons(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.paymentsService.listCoupons(tenantId, query);
  }

  // --- Stats ---

  @Get('payments/stats')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'Revenue stats' })
  async getStats(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.paymentsService.getRevenueStats(tenantId, query);
  }

  // --- Stripe Webhook ---

  @Public()
  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook handler' })
  async stripeWebhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.headers['stripe-signature'] as string;
    await this.paymentsService.handleStripeWebhook(req.rawBody!, signature);
    return { received: true };
  }
}
