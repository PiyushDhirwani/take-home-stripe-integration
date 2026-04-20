import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<Record<keyof AuthService, jest.Mock>>;

  beforeEach(async () => {
    authService = {
      signup: jest.fn().mockResolvedValue({ accessToken: 'token-signup' }),
      login: jest.fn().mockResolvedValue({ accessToken: 'token-login' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should call signup and return accessToken', async () => {
    const result = await controller.signup({ email: 'a@b.com', password: 'pw' });
    expect(authService.signup).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw' });
    expect(result).toEqual({ accessToken: 'token-signup' });
  });

  it('should call login and return accessToken', async () => {
    const result = await controller.login({ email: 'a@b.com', password: 'pw' });
    expect(authService.login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw' });
    expect(result).toEqual({ accessToken: 'token-login' });
  });
});
