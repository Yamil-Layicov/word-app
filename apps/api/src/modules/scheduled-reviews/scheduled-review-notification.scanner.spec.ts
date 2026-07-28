/// <reference types="jest" />

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScheduledReviewInterval } from '@prisma/client';
import { ClockService } from '../../common/time/clock.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { ScheduledReviewNotificationScanner } from './scheduled-review-notification.scanner';
import {
  type DueNotificationClaim,
  ScheduledReviewNotificationsRepository,
} from './scheduled-review-notifications.repository';

const NOW = new Date('2026-07-28T08:00:00.000Z');
const claim: DueNotificationClaim = {
  claimId: 'claim-1',
  userId: 'user-1',
  interval: ScheduledReviewInterval.ONE_HOUR,
};

class TestClockService extends ClockService {
  override now(): Date {
    return NOW;
  }
}

describe('ScheduledReviewNotificationScanner', () => {
  let repository: jest.Mocked<ScheduledReviewNotificationsRepository>;
  let pushNotificationsService: jest.Mocked<PushNotificationsService>;
  let markStartedSchedulesDueMock: jest.Mock;
  let claimDueNotificationGroupsMock: jest.Mock;
  let countClaimedDueSchedulesMock: jest.Mock;
  let markClaimSentMock: jest.Mock;
  let releaseClaimMock: jest.Mock;
  let sendToUserMock: jest.Mock;
  let loggerErrorMock: jest.SpyInstance;
  let scanner: ScheduledReviewNotificationScanner;

  beforeEach(() => {
    loggerErrorMock = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();
    markStartedSchedulesDueMock = jest.fn().mockResolvedValue(2);
    claimDueNotificationGroupsMock = jest.fn().mockResolvedValue([claim]);
    countClaimedDueSchedulesMock = jest.fn().mockResolvedValue(2);
    markClaimSentMock = jest.fn().mockResolvedValue(undefined);
    releaseClaimMock = jest.fn().mockResolvedValue(undefined);
    sendToUserMock = jest.fn().mockResolvedValue({
      requested: 1,
      accepted: 1,
      rejected: 0,
    });

    repository = {
      markStartedSchedulesDue: markStartedSchedulesDueMock,
      claimDueNotificationGroups: claimDueNotificationGroupsMock,
      countClaimedDueSchedules: countClaimedDueSchedulesMock,
      markClaimSent: markClaimSentMock,
      releaseClaim: releaseClaimMock,
    } as unknown as jest.Mocked<ScheduledReviewNotificationsRepository>;
    pushNotificationsService = {
      sendToUser: sendToUserMock,
    } as unknown as jest.Mocked<PushNotificationsService>;
    scanner = new ScheduledReviewNotificationScanner(
      repository,
      pushNotificationsService,
      new TestClockService(),
      {
        get: jest.fn(),
      } as unknown as ConfigService,
    );
  });

  afterEach(() => {
    loggerErrorMock.mockRestore();
  });

  it('marks due schedules and sends one notification for the claimed group', async () => {
    await expect(scanner.scanDueNotifications()).resolves.toEqual({
      markedDue: 2,
      claimedGroups: 1,
      processedGroups: 1,
      failedGroups: 0,
    });
    expect(claimDueNotificationGroupsMock).toHaveBeenCalledWith({
      now: NOW,
      staleBefore: new Date(NOW.getTime() - 5 * 60_000),
      take: 100,
    });
    expect(sendToUserMock).toHaveBeenCalledWith({
      userId: claim.userId,
      title: 'Review ready',
      body: '2 words are ready to review.',
      channelId: 'review-reminders',
      data: {
        type: 'scheduled-review-due',
        interval: ScheduledReviewInterval.ONE_HOUR,
      },
    });
    expect(markClaimSentMock).toHaveBeenCalledWith(claim.claimId, NOW);
    expect(releaseClaimMock).not.toHaveBeenCalled();
  });

  it('releases the claim so a temporary provider failure can be retried', async () => {
    sendToUserMock.mockRejectedValue(new Error('Provider unavailable'));

    await expect(scanner.scanDueNotifications()).resolves.toEqual({
      markedDue: 2,
      claimedGroups: 1,
      processedGroups: 0,
      failedGroups: 1,
    });
    expect(releaseClaimMock).toHaveBeenCalledWith(
      claim.claimId,
      'Provider unavailable',
    );
    expect(markClaimSentMock).not.toHaveBeenCalled();
  });

  it('does not notify when every item in the claim was already completed', async () => {
    countClaimedDueSchedulesMock.mockResolvedValue(0);

    await expect(scanner.scanDueNotifications()).resolves.toEqual({
      markedDue: 2,
      claimedGroups: 1,
      processedGroups: 0,
      failedGroups: 0,
    });
    expect(sendToUserMock).not.toHaveBeenCalled();
    expect(releaseClaimMock).toHaveBeenCalledWith(claim.claimId, null);
  });
});
