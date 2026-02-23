import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class ReconciliationService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2022-11-15',
    });
  }

  async reconcilePayments() {
    try {
      const charges = await this.stripe.charges.list({
        limit: 100,
      });

      // Example reconciliation logic
      charges.data.forEach((charge) => {
        console.log(`Reconciled charge: ${charge.id}, Amount: ${charge.amount}`);
      });
    } catch (error) {
      console.error('Error during reconciliation:', error);
      throw error;
    }
  }
}