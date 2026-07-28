/// <reference types="jest" />

import { PushTokensService } from '../push-tokens/push-tokens.service';
import type { PushNotificationGateway } from './push-notification.gateway';
import { PushNotificationsService } from './push-notifications.service';

const notification = {
  userId: 'user-1',
  title: 'Review ready',
  body: 'Your one-hour review box is ready.',
  channelId: 'review-reminders',
  data: {
    type: 'scheduled-review-due',
    interval: 'ONE_HOUR',
  },
};

describe('PushNotificationsService', () => {
  let getEnabledTokensForUserMock: jest.Mock;
  let gatewaySendMock: jest.Mock;
  let service: PushNotificationsService;

  beforeEach(() => {
    getEnabledTokensForUserMock = jest.fn();
    gatewaySendMock = jest.fn();

    const pushTokensService = {
      getEnabledTokensForUser: getEnabledTokensForUserMock,
    } as unknown as PushTokensService;
    const gateway = {
      send: gatewaySendMock,
    } as PushNotificationGateway;

    service = new PushNotificationsService(pushTokensService, gateway);
  });

  it('skips the provider when the user has no enabled device', async () => {
    getEnabledTokensForUserMock.mockResolvedValue([]);

    await expect(service.sendToUser(notification)).resolves.toEqual({
      requested: 0,
      accepted: 0,
      rejected: 0,
    });
    expect(gatewaySendMock).not.toHaveBeenCalled();
  });

  it('sends one message per enabled device and summarizes tickets', async () => {
    getEnabledTokensForUserMock.mockResolvedValue([
      'ExponentPushToken[device-1]',
      'ExponentPushToken[device-2]',
    ]);
    gatewaySendMock.mockResolvedValue([
      {
        status: 'accepted',
        id: 'ticket-1',
      },
      {
        status: 'rejected',
        code: 'DeviceNotRegistered',
      },
    ]);

    await expect(service.sendToUser(notification)).resolves.toEqual({
      requested: 2,
      accepted: 1,
      rejected: 1,
    });
    expect(gatewaySendMock).toHaveBeenCalledWith([
      {
        to: 'ExponentPushToken[device-1]',
        title: notification.title,
        body: notification.body,
        channelId: notification.channelId,
        data: notification.data,
      },
      {
        to: 'ExponentPushToken[device-2]',
        title: notification.title,
        body: notification.body,
        channelId: notification.channelId,
        data: notification.data,
      },
    ]);
  });
});
