import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2022-11-15',
    });
  }

  async createPaymentIntent(amount: number, currency: string, metadata: Record<string, string>) {
    try {
      return await this.stripe.paymentIntents.create({
        amount,
        currency,
        metadata,
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  async handleWebhookEvent(event: Stripe.Event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          console.log('Payment succeeded:', event.data.object);
          break;
        case 'payment_intent.payment_failed':
          console.log('Payment failed:', event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error handling webhook event:', error);
      throw error;
    }
  }
}