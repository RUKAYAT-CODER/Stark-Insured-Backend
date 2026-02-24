import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums/payment.enum';
import { PaginationDto } from '../../../common/pagination/dto/pagination.dto';
import { PaginatedResult } from '../../../common/pagination/interfaces/paginated-result.interface';

@Injectable()
export class PaymentService {
  // Mock implementation - replace with actual database operations
  private payments: Payment[] = [];

  async processPayment(userId: string, createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const payment: Payment = {
      id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: createPaymentDto.amount,
      currency: createPaymentDto.currency,
      paymentMethod: createPaymentDto.paymentMethodId,
      externalReference: createPaymentDto.referenceId,
      type: createPaymentDto.paymentType as any,
      status: PaymentStatus.PENDING,
      metadata: createPaymentDto.description ? { description: createPaymentDto.description } : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    this.payments.push(payment);
    return payment;
  }

  async confirmPayment(paymentId: string, userId: string): Promise<Payment> {
    const payment = await this.getPaymentById(paymentId, userId);
    
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment cannot be confirmed');
    }

    payment.status = PaymentStatus.COMPLETED;
    payment.updatedAt = new Date();
    
    return payment;
  }

  async cancelPayment(paymentId: string, userId: string): Promise<Payment> {
    const payment = await this.getPaymentById(paymentId, userId);
    
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment cannot be cancelled');
    }

    payment.status = PaymentStatus.FAILED;
    payment.updatedAt = new Date();
    
    return payment;
  }

  async getPaymentById(paymentId: string, userId?: string): Promise<Payment> {
    const payment = this.payments.find(p => p.id === paymentId);
    
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    // In a real implementation, you would check payment.user.id === userId
    // For now, we'll skip the user check since we're using mock data

    return payment;
  }

  async getPaymentsByUserId(userId: string, paginationDto: PaginationDto): Promise<PaginatedResult<Payment>> {
    // Mock implementation - in real implementation, filter by payment.user.id
    const userPayments = this.payments; // .filter(p => p.user.id === userId);
    const { page = 1, limit = 10 } = paginationDto;
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPayments = userPayments.slice(startIndex, endIndex);

    return {
      items: paginatedPayments,
      totalCount: userPayments.length,
      page,
      limit,
      totalPages: Math.ceil(userPayments.length / limit),
    } as any;
  }

  async getPaymentsByStatus(status: PaymentStatus, paginationDto: PaginationDto): Promise<PaginatedResult<Payment>> {
    const statusPayments = this.payments.filter(p => p.status === status);
    const { page = 1, limit = 10 } = paginationDto;
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPayments = statusPayments.slice(startIndex, endIndex);

    return {
      items: paginatedPayments,
      totalCount: statusPayments.length,
      page,
      limit,
      totalPages: Math.ceil(statusPayments.length / limit),
    } as any;
  }

  async getFlaggedPayments(): Promise<Payment[]> {
    // Mock implementation - return payments that might need review
    return this.payments.filter(p => 
      p.amount > 10000 || // Large amounts
      p.status === PaymentStatus.FAILED // Failed payments
    );
  }

  async getPaymentStats(): Promise<{
    totalPayments: number;
    totalAmount: number;
    paymentsByStatus: Record<PaymentStatus, number>;
    flaggedCount: number;
    averageAmount: number;
  }> {
    const totalPayments = this.payments.length;
    const totalAmount = this.payments.reduce((sum, p) => sum + p.amount, 0);
    const averageAmount = totalPayments > 0 ? totalAmount / totalPayments : 0;
    
    const paymentsByStatus = Object.values(PaymentStatus).reduce((acc, status) => {
      acc[status] = this.payments.filter(p => p.status === status).length;
      return acc;
    }, {} as Record<PaymentStatus, number>);

    const flaggedCount = await this.getFlaggedPayments().then(p => p.length);

    return {
      totalPayments,
      totalAmount,
      paymentsByStatus,
      flaggedCount,
      averageAmount,
    };
  }

  async processRefund(
    paymentId: string, 
    amount?: number, 
    reason?: string, 
    adminId?: string
  ): Promise<Payment> {
    const payment = await this.getPaymentById(paymentId);
    
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    payment.status = PaymentStatus.REFUNDED;
    payment.updatedAt = new Date();
    
    // In a real implementation, you would create a separate refund transaction
    // For now, we'll just mark the payment as refunded
    
    return payment;
  }

  async getUserPaymentStats(userId: string): Promise<{
    totalPayments: number;
    totalAmount: number;
    successfulPayments: number;
    failedPayments: number;
    averageAmount: number;
  }> {
    // Mock implementation - in real implementation, filter by payment.user.id
    const userPayments = this.payments; // .filter(p => p.user.id === userId);
    const totalPayments = userPayments.length;
    const totalAmount = userPayments.reduce((sum, p) => sum + p.amount, 0);
    const averageAmount = totalPayments > 0 ? totalAmount / totalPayments : 0;
    const successfulPayments = userPayments.filter(p => p.status === PaymentStatus.COMPLETED).length;
    const failedPayments = userPayments.filter(p => p.status === PaymentStatus.FAILED).length;

    return {
      totalPayments,
      totalAmount,
      successfulPayments,
      failedPayments,
      averageAmount,
    };
  }
}
