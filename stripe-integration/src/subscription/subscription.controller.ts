import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { StripeService } from '../stripe/stripe.service';
import { SubscriptionService } from './subscription.service';

function requireUserId(req: Request): string {
  const user: any = (req as any).user;
  return user?.sub ?? user?.userId ?? user?.id;
}

@Controller()
@ApiTags('subscription')
@ApiBearerAuth()
export class SubscriptionController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create Stripe Checkout Session for a plan' })
  @ApiBody({ schema: { example: { planId: 'basic' } } })
  @Post('checkout')
  async createCheckoutSession(
    @Req() req: Request,
    @Body() body: { planId: 'basic' | 'standard' | 'premium' },
  ) {
    const userId = requireUserId(req);

    const plan = {
      basic: { name: 'Basic', amount: 900 },
      standard: { name: 'Standard', amount: 1900 },
      premium: { name: 'Premium', amount: 2900 },
    }[body.planId];

    if (!plan) {
      throw new BadRequestException('Invalid planId');
    }

    const successUrl = process.env.CHECKOUT_SUCCESS_URL ?? 'http://localhost:3000/success';
    const cancelUrl = process.env.CHECKOUT_CANCEL_URL ?? 'http://localhost:3000/cancel';

    const session = await this.stripeService.client.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      client_reference_id: userId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: plan.amount,
            recurring: { interval: 'month' },
            product_data: { name: plan.name },
          },
        },
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        planId: body.planId,
      },
    });

    await this.subscriptionService.createPending({
      userId,
      planId: body.planId,
      stripeCheckoutSessionId: session.id,
    });

    return { id: session.id, url: session.url };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user subscription' })
  @Get('subscription')
  async getMySubscription(@Req() req: Request) {
    const userId = requireUserId(req);
    return this.subscriptionService.getCurrentForUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel active subscription' })
  @Post('subscription/cancel')
  async cancelMySubscription(@Req() req: Request) {
    const userId = requireUserId(req);
    const sub = await this.subscriptionService.requireActiveForUser(userId);

    if (!sub.stripeSubscriptionId) {
      return { status: 'no_stripe_subscription_id' };
    }

    const canceled = await this.stripeService.client.subscriptions.cancel(sub.stripeSubscriptionId);

    await this.subscriptionService.updateByStripeSubscriptionId({
      stripeSubscriptionId: sub.stripeSubscriptionId,
      status: canceled.status,
    });

    return { status: canceled.status };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel a particular subscription by id' })
  @ApiBody({ schema: { example: { subscriptionId: '...' } } })
  @Post('subscription/cancel-by-id')
  async cancelSubscriptionById(
    @Req() req: Request,
    @Body() body: { subscriptionId: string },
  ) {
    const userId = requireUserId(req);
    const sub = await this.subscriptionService.requireByIdForUser({
      userId,
      subscriptionId: body.subscriptionId,
    });

    if (!sub.stripeSubscriptionId) {
      return { status: 'no_stripe_subscription_id' };
    }

    const canceled = await this.stripeService.client.subscriptions.cancel(sub.stripeSubscriptionId);

    await this.subscriptionService.updateByStripeSubscriptionId({
      stripeSubscriptionId: sub.stripeSubscriptionId,
      status: canceled.status,
    });

    return { status: canceled.status };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] View all user subscriptions' })
  @Get('admin/subscriptions')
  async getAllSubscriptions() {
    return this.subscriptionService.getAllSubscriptions();
  }
}
