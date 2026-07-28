import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClockService } from '../../common/time/clock.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import {
  type DueNotificationClaim,
  ScheduledReviewNotificationsRepository,
} from './scheduled-review-notifications.repository';

const REVIEW_REMINDERS_CHANNEL_ID = 'review-reminders';
const DEFAULT_SCAN_INTERVAL_MS = 60_000;
const CLAIM_LEASE_MS = 5 * 60_000;
const MAX_GROUPS_PER_SCAN = 100;
const MAX_ERROR_LENGTH = 500;

export type ScheduledReviewNotificationScanResult = {
  markedDue: number;
  claimedGroups: number;
  processedGroups: number;
  failedGroups: number;
};

@Injectable()
export class ScheduledReviewNotificationScanner
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(ScheduledReviewNotificationScanner.name);
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  private isScanRunning = false;

  constructor(
    private readonly repository: ScheduledReviewNotificationsRepository,
    private readonly pushNotificationsService: PushNotificationsService,
    private readonly clockService: ClockService,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    const intervalMs = this.getScanIntervalMs();

    if (intervalMs === null) {
      this.logger.log('Scheduled review notification scanner is disabled');
      return;
    }

    void this.runSafely();
    this.scanTimer = setInterval(() => {
      void this.runSafely();
    }, intervalMs);
  }

  onApplicationShutdown(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
  }

  async scanDueNotifications(): Promise<ScheduledReviewNotificationScanResult> {
    const now = this.clockService.now();
    const markedDue = await this.repository.markStartedSchedulesDue(now);
    const claims = await this.repository.claimDueNotificationGroups({
      now,
      staleBefore: new Date(now.getTime() - CLAIM_LEASE_MS),
      take: MAX_GROUPS_PER_SCAN,
    });
    let processedGroups = 0;
    let failedGroups = 0;

    for (const claim of claims) {
      try {
        const processed = await this.processClaim(claim);

        if (processed) {
          processedGroups += 1;
        }
      } catch (error) {
        failedGroups += 1;
        await this.repository.releaseClaim(
          claim.claimId,
          this.toPersistedError(error),
        );
        this.logger.error('Scheduled review notification delivery failed');
      }
    }

    return {
      markedDue,
      claimedGroups: claims.length,
      processedGroups,
      failedGroups,
    };
  }

  private async processClaim(claim: DueNotificationClaim): Promise<boolean> {
    const wordCount = await this.repository.countClaimedDueSchedules(
      claim.claimId,
    );

    if (wordCount === 0) {
      await this.repository.releaseClaim(claim.claimId, null);
      return false;
    }

    await this.pushNotificationsService.sendToUser({
      userId: claim.userId,
      title: 'Review ready',
      body: this.createNotificationBody(wordCount),
      channelId: REVIEW_REMINDERS_CHANNEL_ID,
      data: {
        type: 'scheduled-review-due',
        interval: claim.interval,
      },
    });
    await this.repository.markClaimSent(claim.claimId, this.clockService.now());

    return true;
  }

  private createNotificationBody(wordCount: number): string {
    return wordCount === 1
      ? '1 word is ready to review.'
      : `${wordCount} words are ready to review.`;
  }

  private async runSafely(): Promise<void> {
    if (this.isScanRunning) {
      return;
    }

    this.isScanRunning = true;

    try {
      await this.scanDueNotifications();
    } catch {
      this.logger.error('Scheduled review notification scan failed');
    } finally {
      this.isScanRunning = false;
    }
  }

  private getScanIntervalMs(): number | null {
    const configuredValue = this.configService.get<string>(
      'SCHEDULED_REVIEW_NOTIFICATION_SCAN_INTERVAL_MS',
      String(DEFAULT_SCAN_INTERVAL_MS),
    );
    const intervalMs = Number(configuredValue);

    if (intervalMs === 0) {
      return null;
    }

    if (!Number.isInteger(intervalMs) || intervalMs < 1_000) {
      this.logger.warn(
        'Invalid scheduled review notification scan interval; using default',
      );
      return DEFAULT_SCAN_INTERVAL_MS;
    }

    return intervalMs;
  }

  private toPersistedError(error: unknown): string {
    const message =
      error instanceof Error ? error.message : 'Unknown notification error';

    return message.slice(0, MAX_ERROR_LENGTH);
  }
}
