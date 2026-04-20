import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subscription } from './subscription.schema';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<Subscription>,
  ) {}

  async createPending(params: {
    userId: string;
    planId: string;
    stripeCheckoutSessionId: string;
  }): Promise<Subscription> {
    const created = await this.subscriptionModel.create({
      userId: new Types.ObjectId(params.userId),
      planId: params.planId,
      status: 'pending',
      stripeCheckoutSessionId: params.stripeCheckoutSessionId,
    });

    return created.toObject();
  }

  async upsertFromCheckoutCompleted(params: {
    stripeCheckoutSessionId: string;
    userId: string;
    planId: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    status: string;
  }): Promise<void> {
    await this.subscriptionModel.updateOne(
      { stripeCheckoutSessionId: params.stripeCheckoutSessionId },
      {
        $set: {
          userId: new Types.ObjectId(params.userId),
          planId: params.planId,
          status: (params.status as any) ?? 'active',
          stripeCustomerId: params.stripeCustomerId,
          stripeSubscriptionId: params.stripeSubscriptionId,
        },
      },
      { upsert: true },
    );
  }

  async updateByStripeSubscriptionId(params: {
    stripeSubscriptionId: string;
    status: string;
  }): Promise<void> {
    await this.subscriptionModel.updateOne(
      { stripeSubscriptionId: params.stripeSubscriptionId },
      { $set: { status: params.status as any } },
    );
  }

  async getCurrentForUser(userId: string): Promise<Subscription | null> {
    return this.subscriptionModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  async requireActiveForUser(userId: string): Promise<Subscription> {
    const sub = await this.subscriptionModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'active' })
      .sort({ createdAt: -1 })
      .lean();

    if (!sub) {
      throw new NotFoundException('No active subscription');
    }

    return sub as any;
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    return this.subscriptionModel.find().sort({ createdAt: -1 }).lean();
  }

  async requireByIdForUser(params: {
    userId: string;
    subscriptionId: string;
  }): Promise<Subscription> {
    const sub = await this.subscriptionModel
      .findOne({
        _id: new Types.ObjectId(params.subscriptionId),
        userId: new Types.ObjectId(params.userId),
      })
      .lean();

    if (!sub) {
      throw new NotFoundException('Subscription not found');
    }

    return sub as any;
  }
}
