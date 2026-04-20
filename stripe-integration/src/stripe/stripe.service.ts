import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe?: Stripe;

  get client(): Stripe {
    if (this.stripe) {
      return this.stripe;
    }

    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-08-27.basil',
    });

    return this.stripe;
  }
}
