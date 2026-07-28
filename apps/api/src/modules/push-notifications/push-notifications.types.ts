export type PushNotificationData = Readonly<Record<string, string>>;

export type PushNotificationMessage = {
  to: string;
  title: string;
  body: string;
  channelId: string;
  data?: PushNotificationData;
};

export type PushGatewayTicket =
  | {
      status: 'accepted';
      id: string;
    }
  | {
      status: 'rejected';
      code: string | null;
    };

export type SendPushNotificationInput = {
  userId: string;
  title: string;
  body: string;
  channelId: string;
  data?: PushNotificationData;
};

export type SendPushNotificationResult = {
  requested: number;
  accepted: number;
  rejected: number;
};
