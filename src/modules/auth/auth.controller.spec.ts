import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { RevokeTokenDto } from './dtos/revoke-token.dto';
import { RefreshResponseDto } from './dtos/refresh-response.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<AuthService>;

  beforeEach(async () => {
    authService = {
      refreshAccessToken: jest.fn().mockResolvedValue({
        accessToken: 'a',
        expiresIn: 100,
        expiresAt: new Date(),
        tokenType: 'Bearer',
        refreshToken: 'newRefresh',
      }),
      logout: jest.fn().mockResolvedValue(undefined),
      revokeToken: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
    })
      .overrideProvider(AuthService)
      .useValue(authService)
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call authService.refreshAccessToken with client IP and userAgent', async () => {
    const dto: RefreshTokenDto = { refreshToken: 'old', sessionToken: 'sess' };
    const req: any = { headers: { 'x-forwarded-for': '1.2.3.4', 'user-agent': 'ua' } };
    const res = await controller.refreshToken(dto, req);
    expect(authService.refreshAccessToken).toHaveBeenCalledWith('old', 'sess', '1.2.3.4', 'ua');
    expect(res).toHaveProperty('accessToken');
  });

  it('should call authService.revokeToken when revoke endpoint hit', async () => {
    const dto: RevokeTokenDto = { token: 'abc' };
    const req: any = { headers: { 'x-forwarded-for': '5.6.7.8' } };
    const res = await controller.revoke(dto, req);
    expect(authService.revokeToken).toHaveBeenCalledWith('abc', '5.6.7.8');
    expect(res).toEqual({ message: 'Token revoked successfully' });
  });
});
