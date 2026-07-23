import { Injectable } from '@nestjs/common';
import type { PushPlatform, UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type RegisterPushTokenInput = {
  userId: string;
  token: string;
  platform: PushPlatform;
};

@Injectable()
export class PushTokensRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserStatus(userId: string): Promise<UserStatus | null> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        status: true,
      },
    });

    return user?.status ?? null;
  }

  async register(input: RegisterPushTokenInput): Promise<void> {
    await this.prisma.pushDeviceToken.upsert({
      where: {
        token: input.token,
      },
      create: {
        userId: input.userId,
        token: input.token,
        platform: input.platform,
      },
      update: {
        userId: input.userId,
        platform: input.platform,
        isEnabled: true,
      },
    });
  }
}
