import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { Subscription } from './subscription.schema';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let model: any;

  const mockModel = {
    create: jest.fn(),
    updateOne: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: getModelToken(Subscription.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    model = mockModel;

    jest.clearAllMocks();
  });

  describe('createPending', () => {
    it('should create a pending subscription', async () => {
      const mockDoc = {
        toObject: () => ({
          userId: 'user-id',
          planId: 'basic',
          status: 'pending',
          stripeCheckoutSessionId: 'cs_123',
        }),
      };
      model.create.mockResolvedValue(mockDoc);

      const result = await service.createPending({
        userId: '507f1f77bcf86cd799439011',
        planId: 'basic',
        stripeCheckoutSessionId: 'cs_123',
      });

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({ planId: 'basic', status: 'pending' }),
      );
      expect(result.status).toBe('pending');
    });
  });

  describe('getCurrentForUser', () => {
    it('should return null when no subscriptions exist', async () => {
      model.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await service.getCurrentForUser('507f1f77bcf86cd799439011');
      expect(result).toBeNull();
    });
  });

  describe('requireActiveForUser', () => {
    it('should throw NotFoundException when no active subscription', async () => {
      model.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.requireActiveForUser('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllSubscriptions', () => {
    it('should return all subscriptions', async () => {
      const mockSubs = [{ planId: 'basic' }, { planId: 'premium' }];
      model.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockSubs),
        }),
      });

      const result = await service.getAllSubscriptions();
      expect(result).toHaveLength(2);
    });
  });
});
