import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentService } from './services/payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from './enums/payment.enum';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { Idempotent } from '../../common/idempotency';
import { PaginationDto } from '../../common/pagination/dto/pagination.dto';
import { PaginatedResult } from '../../common/pagination/interfaces/paginated-result.interface';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * POST /payments/process
   * Process a new payment
   * Requires: authenticated user with valid payment method
   * Requires: Idempotency-Key header for deduplication
   * Security: Payment tier rate limiting (20 req/min)
   * Response: 201 Created with payment details
   */
  @Post('process')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit('payment')
  @Idempotent()
  @ApiOperation({ summary: 'Process a new payment' })
  @ApiResponse({ status: 201, description: 'Payment processed successfully' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async processPayment(
    @Request() req: any,
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<Payment> {
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    return this.paymentService.processPayment(userId, createPaymentDto);
  }

  /**
   * POST /payments/:paymentId/confirm
   * Confirm a pending payment
   * Security: Payment tier rate limiting (20 req/min)
   */
  @Post(':paymentId/confirm')
  @HttpCode(HttpStatus.OK)
  @RateLimit('payment')
  @Idempotent()
  @ApiOperation({ summary: 'Confirm a pending payment' })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  async confirmPayment(
    @Param('paymentId') paymentId: string,
    @Request() req: any,
  ): Promise<Payment> {
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    return this.paymentService.confirmPayment(paymentId, userId);
  }

  /**
   * POST /payments/:paymentId/cancel
   * Cancel a pending payment
   * Security: Payment tier rate limiting (20 req/min)
   */
  @Post(':paymentId/cancel')
  @HttpCode(HttpStatus.OK)
  @RateLimit('payment')
  @Idempotent()
  @ApiOperation({ summary: 'Cancel a pending payment' })
  @ApiResponse({ status: 200, description: 'Payment cancelled successfully' })
  async cancelPayment(
    @Param('paymentId') paymentId: string,
    @Request() req: any,
  ): Promise<Payment> {
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    return this.paymentService.cancelPayment(paymentId, userId);
  }

  /**
   * GET /payments/:paymentId
   * Retrieve a specific payment by ID
   * Security: Authenticated tier rate limiting (200 req/min)
   */
  @Get(':paymentId')
  @RateLimit('authenticated')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  async getPaymentById(
    @Param('paymentId') paymentId: string,
    @Request() req: any,
  ): Promise<Payment> {
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const payment = await this.paymentService.getPaymentById(paymentId, userId);

    if (!payment) {
      throw new BadRequestException(`Payment ${paymentId} not found`);
    }

    return payment;
  }

  /**
   * GET /payments/user/me
   * Retrieve all payments for the authenticated user
   * Security: Authenticated tier rate limiting (200 req/min)
   */
  @Get('user/me')
  @RateLimit('authenticated')
  @ApiOperation({ summary: 'Get user payments' })
  @ApiResponse({ status: 200, description: 'User payments retrieved successfully' })
  async getUserPayments(
    @Request() req: any,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResult<Payment>> {
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    return this.paymentService.getPaymentsByUserId(userId, paginationDto);
  }

  /**
   * GET /payments/status/:status
   * Retrieve payments by status (admin endpoint)
   * Security: Admin tier rate limiting (500 req/min)
   */
  @Get('status/:status')
  @RateLimit('admin')
  @ApiOperation({ summary: 'Get payments by status (admin)' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async getPaymentsByStatus(
    @Param('status') status: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResult<Payment>> {
    if (!Object.values(PaymentStatus).includes(status as PaymentStatus)) {
      throw new BadRequestException(`Invalid payment status: ${status}`);
    }

    return this.paymentService.getPaymentsByStatus(status as PaymentStatus, paginationDto);
  }

  /**
   * GET /payments/admin/flagged
   * Retrieve all payments flagged for review (admin endpoint)
   * Security: Admin tier rate limiting (500 req/min)
   */
  @Get('admin/flagged')
  @RateLimit('admin')
  @ApiOperation({ summary: 'Get flagged payments (admin)' })
  @ApiResponse({ status: 200, description: 'Flagged payments retrieved successfully' })
  async getFlaggedPayments(): Promise<Payment[]> {
    return this.paymentService.getFlaggedPayments();
  }

  /**
   * GET /payments/admin/stats
   * Get payment statistics (admin endpoint)
   * Security: Admin tier rate limiting (500 req/min)
   */
  @Get('admin/stats')
  @RateLimit('admin')
  @ApiOperation({ summary: 'Get payment statistics (admin)' })
  @ApiResponse({ status: 200, description: 'Payment statistics retrieved successfully' })
  async getPaymentStats(): Promise<{
    totalPayments: number;
    totalAmount: number;
    paymentsByStatus: Record<PaymentStatus, number>;
    flaggedCount: number;
    averageAmount: number;
  }> {
    return this.paymentService.getPaymentStats();
  }

  /**
   * POST /payments/:paymentId/refund
   * Process a refund (admin endpoint)
   * Security: Payment tier rate limiting (20 req/min) - more restrictive for financial operations
   */
  @Post(':paymentId/refund')
  @HttpCode(HttpStatus.OK)
  @RateLimit('payment')
  @Idempotent()
  @ApiOperation({ summary: 'Process payment refund (admin)' })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  async processRefund(
    @Param('paymentId') paymentId: string,
    @Body() body: { amount?: number; reason?: string },
    @Request() req: any,
  ): Promise<Payment> {
    const adminId = req.user?.id;

    if (!adminId) {
      throw new BadRequestException('Admin ID is required');
    }

    return this.paymentService.processRefund(paymentId, body.amount, body.reason, adminId);
  }

  /**
   * GET /payments/user/me/stats
   * Get payment statistics for the authenticated user
   * Security: Authenticated tier rate limiting (200 req/min)
   */
  @Get('user/me/stats')
  @RateLimit('authenticated')
  @ApiOperation({ summary: 'Get user payment statistics' })
  @ApiResponse({ status: 200, description: 'User payment statistics retrieved successfully' })
  async getUserPaymentStats(@Request() req: any): Promise<{
    totalPayments: number;
    totalAmount: number;
    successfulPayments: number;
    failedPayments: number;
    averageAmount: number;
  }> {
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    return this.paymentService.getUserPaymentStats(userId);
  }
}
