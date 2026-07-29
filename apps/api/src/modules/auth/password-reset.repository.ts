import { Injectable } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type ResettableUser = {
  id: string;
};

type ReplacePasswordResetTokenInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

@Injectable()
export class PasswordResetRepository {
  constructor(private readonly prisma: PrismaService) {}

  findResettableUserByEmail(email: string): Promise<ResettableUser | null> {
    return this.prisma.user.findFirst({
      where: {
        email,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
  }

  async replaceToken(input: ReplacePasswordResetTokenInput): Promise<void> {
    await this.prisma.passwordResetToken.upsert({
      where: {
        userId: input.userId,
      },
      create: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
      update: {
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        usedAt: null,
        revokedAt: null,
      },
    });
  }
}
