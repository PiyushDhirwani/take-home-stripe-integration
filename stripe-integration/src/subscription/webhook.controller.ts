import { Controller, Headers, Logger, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StripeService } from '../stripe/stripe.service';
import { SubscriptionService } from './subscription.service';

@Controller()
@ApiTags('stripe')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature?: string,
  ) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required');
    }

    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!rawBody) {
      throw new Error('Missing raw body (ensure raw body middleware is enabled)');
    }

    let event;
    try {
      event = this.stripeService.client.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      this.logger.error('Stripe webhook signature verification failed', err?.message);
      throw err;
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session?.metadata?.userId;
        const planId = session?.metadata?.planId;

        await this.subscriptionService.upsertFromCheckoutCompleted({
          stripeCheckoutSessionId: session.id,
          userId,
          planId,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          status: 'active',
        });
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        await this.subscriptionService.updateByStripeSubscriptionId({
          stripeSubscriptionId: sub.id,
          status: sub.status,
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const stripeSubscriptionId = invoice?.subscription;
        if (stripeSubscriptionId) {
          this.logger.error(`Stripe payment failed for subscription ${stripeSubscriptionId}`);
          await this.subscriptionService.updateByStripeSubscriptionId({
            stripeSubscriptionId,
            status: 'past_due',
          });
        }
        break;
      }

      default:
        break;
    }

    return { received: true };
  }
}
