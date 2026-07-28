import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  type Prisma,
  ScheduledReviewInterval,
  ScheduledReviewState,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type DueNotificationClaim = {
  claimId: string;
  userId: string;
  interval: ScheduledReviewInterval;
};

type ClaimDueNotificationGroupsInput = {
  now: Date;
  staleBefore: Date;
  take: number;
};

const dueNotificationGroupSelect = {
  userId: true,
  interval: true,
} as const;

@Injectable()
export class ScheduledReviewNotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async markStartedSchedulesDue(now: Date): Promise<number> {
    const result = await this.prisma.userWordSchedule.updateMany({
      where: {
        state: ScheduledReviewState.STARTED,
        dueAt: {
          lte: now,
        },
      },
      data: {
        state: ScheduledReviewState.DUE,
      },
    });

    return result.count;
  }

  async claimDueNotificationGroups(
    input: ClaimDueNotificationGroupsInput,
  ): Promise<DueNotificationClaim[]> {
    const candidates = await this.prisma.userWordSchedule.findMany({
      where: this.getClaimableWhere(input.staleBefore),
      distinct: ['userId', 'interval'],
      orderBy: {
        dueAt: 'asc',
      },
      take: input.take,
      select: dueNotificationGroupSelect,
    });
    const claims: DueNotificationClaim[] = [];

    for (const candidate of candidates) {
      const claimId = randomUUID();
      const result = await this.prisma.userWordSchedule.updateMany({
        where: {
          ...this.getClaimableWhere(input.staleBefore),
          userId: candidate.userId,
          interval: candidate.interval,
        },
        data: {
          dueNotificationClaimId: claimId,
          dueNotificationClaimedAt: input.now,
          dueNotificationAttempts: {
            increment: 1,
          },
        },
      });

      if (result.count > 0) {
        claims.push({
          claimId,
          userId: candidate.userId,
          interval: candidate.interval,
        });
      }
    }

    return claims;
  }

  countClaimedDueSchedules(claimId: string): Promise<number> {
    return this.prisma.userWordSchedule.count({
      where: {
        dueNotificationClaimId: claimId,
        state: ScheduledReviewState.DUE,
      },
    });
  }

  async markClaimSent(claimId: string, sentAt: Date): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userWordSchedule.updateMany({
        where: {
          dueNotificationClaimId: claimId,
          state: ScheduledReviewState.DUE,
        },
        data: {
          dueNotificationSentAt: sentAt,
          dueNotificationClaimId: null,
          dueNotificationClaimedAt: null,
          dueNotificationLastError: null,
        },
      });
      await tx.userWordSchedule.updateMany({
        where: {
          dueNotificationClaimId: claimId,
        },
        data: {
          dueNotificationClaimId: null,
          dueNotificationClaimedAt: null,
        },
      });
    });
  }

  async releaseClaim(claimId: string, error: string | null): Promise<void> {
    await this.prisma.userWordSchedule.updateMany({
      where: {
        dueNotificationClaimId: claimId,
      },
      data: {
        dueNotificationClaimId: null,
        dueNotificationClaimedAt: null,
        dueNotificationLastError: error,
      },
    });
  }

  private getClaimableWhere(
    staleBefore: Date,
  ): Prisma.UserWordScheduleWhereInput {
    return {
      state: ScheduledReviewState.DUE,
      dueNotificationSentAt: null,
      OR: [
        {
          dueNotificationClaimedAt: null,
        },
        {
          dueNotificationClaimedAt: {
            lte: staleBefore,
          },
        },
      ],
    };
  }
}
