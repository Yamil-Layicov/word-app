import { Injectable } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type UnverifiedUser = {
  id: string;
};

type ReplaceEmailVerificationTokenInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

type ConsumeEmailVerificationTokenInput = {
  tokenHash: string;
  now: Date;
};

@Injectable()
export class EmailVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUnverifiedUserByEmail(email: string): Promise<UnverifiedUser | null> {
    return this.prisma.user.findFirst({
      where: {
        email,
        emailVerifiedAt: null,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
  }

  async replaceToken(input: ReplaceEmailVerificationTokenInput): Promise<void> {
    await this.prisma.emailVerificationToken.upsert({
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

  async consumeTokenAndVerifyEmail(
    input: ConsumeEmailVerificationTokenInput,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const token = await tx.emailVerificationToken.findFirst({
        where: {
          tokenHash: input.tokenHash,
          usedAt: null,
          revokedAt: null,
          expiresAt: {
            gt: input.now,
          },
          user: {
            emailVerifiedAt: null,
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

      const consumedToken = await tx.emailVerificationToken.updateMany({
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

      const verifiedUser = await tx.user.updateMany({
        where: {
          id: token.userId,
          emailVerifiedAt: null,
          status: UserStatus.ACTIVE,
          deletedAt: null,
        },
        data: {
          emailVerifiedAt: input.now,
        },
      });

      if (verifiedUser.count === 0) {
        throw new Error('Email verification account became unavailable');
      }

      return true;
    });
  }
}
