import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  Logger,
  Headers,
  RawBodyRequest,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { BillingService } from './billing.service';
import {
  CreateCheckoutSessionDto,
  CancelSubscriptionDto,
  UpdateSubscriptionDto,
  VerifyAppleReceiptDto,
  VerifyGooglePurchaseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Billing')
@Controller('workspaces/:workspaceId/billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(private readonly billingService: BillingService) {}

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get workspace subscription details' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription details retrieved successfully',
  })
  async getSubscription(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    this.logger.log(`Getting subscription for workspace ${workspaceId}`);
    return this.billingService.getSubscription(workspaceId, userId);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get available subscription plans' })
  @ApiResponse({
    status: 200,
    description: 'Subscription plans retrieved successfully',
  })
  async getPlans() {
    this.logger.log('Getting subscription plans');
    return this.billingService.getPlans();
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created successfully',
  })
  async createCheckout(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    const userId = req.user.sub || req.user.userId;
    this.logger.log(`Creating checkout session for workspace ${workspaceId}`);
    return this.billingService.createCheckout(workspaceId, userId, dto);
  }

  @Post('subscription/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel workspace subscription' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription canceled successfully',
  })
  async cancelSubscription(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
    @Body() dto: CancelSubscriptionDto,
  ) {
    const userId = req.user.sub || req.user.userId;
    this.logger.log(`Canceling subscription for workspace ${workspaceId}`);
    return this.billingService.cancelSubscription(workspaceId, userId, dto);
  }

  @Post('subscription/resume')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resume canceled subscription' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription resumed successfully',
  })
  async resumeSubscription(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    this.logger.log(`Resuming subscription for workspace ${workspaceId}`);
    return this.billingService.resumeSubscription(workspaceId, userId);
  }

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get workspace invoices' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'Invoices retrieved successfully',
  })
  async getInvoices(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    this.logger.log(`Getting invoices for workspace ${workspaceId}`);
    return this.billingService.getInvoices(workspaceId, userId);
  }

  @Get('payment-methods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get workspace payment methods' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment methods retrieved successfully',
  })
  async getPaymentMethods(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    this.logger.log(`Getting payment methods for workspace ${workspaceId}`);
    return this.billingService.getPaymentMethods(workspaceId, userId);
  }

  // ============================================
  // In-App Purchase (IAP) Endpoints
  // ============================================

  @Post('iap/apple/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify Apple App Store receipt' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 201,
    description: 'Apple receipt verified successfully',
  })
  async verifyAppleReceipt(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
    @Body() dto: VerifyAppleReceiptDto,
  ) {
    const userId = req.user.sub || req.user.userId;
    this.logger.log(`Verifying Apple receipt for workspace ${workspaceId}`);
    return this.billingService.verifyAppleReceipt(workspaceId, userId, dto);
  }

  @Post('iap/google/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify Google Play purchase' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 201,
    description: 'Google purchase verified successfully',
  })
  async verifyGooglePurchase(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
    @Body() dto: VerifyGooglePurchaseDto,
  ) {
    const userId = req.user.sub || req.user.userId;
    this.logger.log(`Verifying Google purchase for workspace ${workspaceId}`);
    return this.billingService.verifyGooglePurchase(workspaceId, userId, dto);
  }

  @Get('iap/products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get IAP product IDs' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'IAP product IDs retrieved successfully',
  })
  async getIAPProductIds(@Param('workspaceId') workspaceId: string) {
    this.logger.log(`Getting IAP product IDs for workspace ${workspaceId}`);
    return this.billingService.getIAPProductIds();
  }
}
