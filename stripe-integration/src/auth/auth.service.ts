import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(params: {
    email: string;
    password: string;
  }): Promise<{ accessToken: string }> {
    const passwordHash = await bcrypt.hash(params.password, 10);

    const user = await this.usersService.createUser({
      email: params.email,
      passwordHash,
    });

    const accessToken = await this.jwtService.signAsync({
      sub: (user as any)._id?.toString?.() ?? (user as any).id,
      email: user.email,
      role: (user as any).role ?? 'user',
    });

    return { accessToken };
  }

  async login(params: {
    email: string;
    password: string;
  }): Promise<{ accessToken: string }> {
    const user = await this.usersService.findByEmail(params.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(params.password, (user as any).passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: (user as any)._id?.toString?.() ?? (user as any).id,
      email: (user as any).email,
      role: (user as any).role ?? 'user',
    });

    return { accessToken };
  }
}
