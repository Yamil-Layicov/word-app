import type {
  PushGatewayTicket,
  PushNotificationMessage,
} from './push-notifications.types';

export const PUSH_NOTIFICATION_GATEWAY = Symbol('PUSH_NOTIFICATION_GATEWAY');

export interface PushNotificationGateway {
  send(
    messages: readonly PushNotificationMessage[],
  ): Promise<readonly PushGatewayTicket[]>;
}
