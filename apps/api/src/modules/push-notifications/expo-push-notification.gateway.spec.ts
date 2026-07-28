/// <reference types="jest" />

import { ConfigService } from '@nestjs/config';
import { ExpoPushNotificationGateway } from './expo-push-notification.gateway';
import type { PushNotificationMessage } from './push-notifications.types';

const message: PushNotificationMessage = {
  to: 'ExponentPushToken[device-1]',
  title: 'Review ready',
  body: 'Your one-hour review box is ready.',
  channelId: 'review-reminders',
  data: {
    type: 'scheduled-review-due',
  },
};

describe('ExpoPushNotificationGateway', () => {
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  let gateway: ExpoPushNotificationGateway;

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    fetchMock = jest.spyOn(global, 'fetch');
    gateway = new ExpoPushNotificationGateway(configService);
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('maps Expo tickets without exposing device tokens in the result', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        data: [
          {
            status: 'ok',
            id: 'ticket-1',
          },
        ],
      }),
    } as unknown as Response);

    await expect(gateway.send([message])).resolves.toEqual([
      {
        status: 'accepted',
        id: 'ticket-1',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify([
          {
            ...message,
            sound: 'default',
          },
        ]),
      }),
    );
  });

  it('rejects an unsuccessful provider response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    await expect(gateway.send([message])).rejects.toThrow(
      'Expo push request failed with status 503',
    );
  });
});
