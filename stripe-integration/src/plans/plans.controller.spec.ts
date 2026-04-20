import { Test, TestingModule } from '@nestjs/testing';
import { PlansController } from './plans.controller';

describe('PlansController', () => {
  let controller: PlansController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlansController],
    }).compile();

    controller = module.get<PlansController>(PlansController);
  });

  it('should return 3 hardcoded plans', () => {
    const plans = controller.getPlans();
    expect(plans).toHaveLength(3);
    expect(plans.map((p) => p.id)).toEqual(['basic', 'standard', 'premium']);
  });

  it('should return correct plan structure', () => {
    const plans = controller.getPlans();
    for (const plan of plans) {
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('priceMonthlyUsd');
      expect(typeof plan.priceMonthlyUsd).toBe('number');
    }
  });
});
