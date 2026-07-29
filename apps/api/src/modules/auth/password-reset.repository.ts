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

type ConsumePasswordResetTokenInput = {
  tokenHash: string;
  passwordHash: string;
  now: Date;
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

  async consumeTokenAndResetPassword(
    input: ConsumePasswordResetTokenInput,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const token = await tx.passwordResetToken.findFirst({
        where: {
          tokenHash: input.tokenHash,
          usedAt: null,
          revokedAt: null,
          expiresAt: {
            gt: input.now,
          },
          user: {
            status: UserStatus.ACTIVE,
            deletedAt: null,
          },
        },
        select: {
          id: true,
          userId: true,
        },
      });

      if (!token) {
        return false;
      }

      const consumedToken = await tx.passwordResetToken.updateMany({
        where: {
          id: token.id,
          tokenHash: input.tokenHash,
          usedAt: null,
          revokedAt: null,
          expiresAt: {
            gt: input.now,
          },
        },
        data: {
          usedAt: input.now,
        },
      });

      if (consumedToken.count === 0) {
        return false;
      }

      const updatedUser = await tx.user.updateMany({
        where: {
          id: token.userId,
          status: UserStatus.ACTIVE,
          deletedAt: null,
        },
        data: {
          passwordHash: input.passwordHash,
        },
      });

      if (updatedUser.count === 0) {
        throw new Error('Password reset account became unavailable');
      }

      await tx.authSession.updateMany({
        where: {
          userId: token.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: input.now,
        },
      });

      return true;
    });
  }
}
