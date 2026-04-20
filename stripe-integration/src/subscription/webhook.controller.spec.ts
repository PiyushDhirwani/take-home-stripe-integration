import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from './webhook.controller';
import { StripeService } from '../stripe/stripe.service';
import { SubscriptionService } from './subscription.service';

describe('WebhookController', () => {
  let controller: WebhookController;
  let stripeService: any;
  let subscriptionService: any;

  beforeEach(async () => {
    stripeService = {
      client: {
        webhooks: {
          constructEvent: jest.fn(),
        },
      },
    };

    subscriptionService = {
      upsertFromCheckoutCompleted: jest.fn(),
      updateByStripeSubscriptionId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        { provide: StripeService, useValue: stripeService },
        { provide: SubscriptionService, useValue: subscriptionService },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
  });

  it('should throw if STRIPE_WEBHOOK_SECRET is missing', async () => {
    const origSecret = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const req = { rawBody: Buffer.from('{}') } as any;
    await expect(controller.handleWebhook(req, 'sig')).rejects.toThrow(
      'STRIPE_WEBHOOK_SECRET is required',
    );

    process.env.STRIPE_WEBHOOK_SECRET = origSecret;
  });

  it('should throw if stripe-signature header is missing', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    const req = { rawBody: Buffer.from('{}') } as any;
    await expect(controller.handleWebhook(req, undefined)).rejects.toThrow(
      'Missing stripe-signature header',
    );
  });

  it('should handle checkout.session.completed', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    stripeService.client.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_123',
          customer: 'cus_123',
          subscription: 'sub_123',
          metadata: { userId: 'user1', planId: 'basic' },
        },
      },
    });

    const req = { rawBody: Buffer.from('{}') } as any;
    const result = await controller.handleWebhook(req, 'sig_valid');

    expect(subscriptionService.upsertFromCheckoutCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeCheckoutSessionId: 'cs_123',
        userId: 'user1',
        planId: 'basic',
        status: 'active',
      }),
    );
    expect(result).toEqual({ received: true });
  });

  it('should handle customer.subscription.deleted', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    stripeService.client.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_123', status: 'canceled' } },
    });

    const req = { rawBody: Buffer.from('{}') } as any;
    const result = await controller.handleWebhook(req, 'sig_valid');

    expect(subscriptionService.updateByStripeSubscriptionId).toHaveBeenCalledWith({
      stripeSubscriptionId: 'sub_123',
      status: 'canceled',
    });
    expect(result).toEqual({ received: true });
  });
});
