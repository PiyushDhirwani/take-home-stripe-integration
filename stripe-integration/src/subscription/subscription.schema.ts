import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SubscriptionDocument = HydratedDocument<Subscription>;

export type SubscriptionStatus = 'pending' | 'active' | 'canceled' | 'incomplete' | 'past_due';

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  planId!: string;

  @Prop({ required: true })
  status!: SubscriptionStatus;

  @Prop()
  stripeCustomerId?: string;

  @Prop({ index: true })
  stripeSubscriptionId?: string;

  @Prop({ index: true })
  stripeCheckoutSessionId?: string;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
SubscriptionSchema.index({ userId: 1, status: 1 });
