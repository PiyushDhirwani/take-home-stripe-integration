import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.schema';

describe('UsersService', () => {
  let service: UsersService;
  let model: any;

  const mockModel = {
    create: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    model = mockModel;
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create and return a user', async () => {
      const mockUser = { email: 'test@example.com', passwordHash: 'hash123' };
      model.create.mockResolvedValue({ toObject: () => mockUser });

      const result = await service.createUser({ email: 'test@example.com', passwordHash: 'hash123' });
      expect(result).toEqual(mockUser);
      expect(model.create).toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate email', async () => {
      model.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.createUser({ email: 'dup@example.com', passwordHash: 'hash' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found', async () => {
      const mockUser = { email: 'test@example.com' };
      model.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(mockUser) });

      const result = await service.findByEmail('Test@Example.com');
      expect(result).toEqual(mockUser);
      expect(model.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should return null when not found', async () => {
      model.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      const result = await service.findByEmail('no@user.com');
      expect(result).toBeNull();
    });
  });
});
