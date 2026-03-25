import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(walletAddress: string, signature: string): Promise<any> {
    // In a real application, you would verify the signature here
    // For now, we assume it's valid if the user exists
    const user = await this.prisma.user.findUnique({
      where: { walletAddress },
    });
    
    if (user) {
      return user;
    }
    return null;
  }

  async login(user: any) {
    const payload = { sub: user.id, walletAddress: user.walletAddress };
    return {
      userId: user.id,
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  async logout(userId: string) {
    // Perform any server-side cleanup if necessary (e.g., blacklisting tokens)
    return { success: true };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      
      if (!user) throw new UnauthorizedException();

      return {
        userId: user.id,
        accessToken: this.jwtService.sign({ sub: user.id, walletAddress: user.walletAddress }),
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
