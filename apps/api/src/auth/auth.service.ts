import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService }    from '@nestjs/jwt';
import * as bcrypt       from 'bcrypt';
import { PrismaService } from '@garagesage/prisma';
import { RegisterDto }   from '@garagesage/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt:    JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, name: dto.name },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return { user, access_token: token };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const { passwordHash: _, ...result } = user;
    return result;
  }

  login(user: { id: string; email: string; role: string }) {
    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return { user, access_token: token };
  }

  async profile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }
}
