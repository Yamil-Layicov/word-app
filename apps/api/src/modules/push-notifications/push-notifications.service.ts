import { Inject, Injectable } from '@nestjs/common';
import { PushTokensService } from '../push-tokens/push-tokens.service';
import {
  PUSH_NOTIFICATION_GATEWAY,
  type PushNotificationGateway,
} from './push-notification.gateway';
import type {
  SendPushNotificationInput,
  SendPushNotificationResult,
} from './push-notifications.types';

@Injectable()
export class PushNotificationsService {
  constructor(
    private readonly pushTokensService: PushTokensService,
    @Inject(PUSH_NOTIFICATION_GATEWAY)
    private readonly pushNotificationGateway: PushNotificationGateway,
  ) {}

  async sendToUser(
    input: SendPushNotificationInput,
  ): Promise<SendPushNotificationResult> {
    const tokens = await this.pushTokensService.getEnabledTokensForUser(
      input.userId,
    );

    if (tokens.length === 0) {
      return {
        requested: 0,
        accepted: 0,
        rejected: 0,
      };
    }

    const tickets = await this.pushNotificationGateway.send(
      tokens.map((token) => ({
        to: token,
        title: input.title,
        body: input.body,
        channelId: input.channelId,
        data: input.data,
      })),
    );
    const accepted = tickets.filter(
      (ticket) => ticket.status === 'accepted',
    ).length;

    return {
      requested: tokens.length,
      accepted,
      rejected: tickets.length - accepted,
    };
  }
}
