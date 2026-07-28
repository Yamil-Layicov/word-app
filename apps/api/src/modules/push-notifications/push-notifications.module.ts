import { Module } from '@nestjs/common';
import { PushTokensModule } from '../push-tokens/push-tokens.module';
import { ExpoPushNotificationGateway } from './expo-push-notification.gateway';
import { PUSH_NOTIFICATION_GATEWAY } from './push-notification.gateway';
import { PushNotificationsService } from './push-notifications.service';

@Module({
  imports: [PushTokensModule],
  providers: [
    PushNotificationsService,
    {
      provide: PUSH_NOTIFICATION_GATEWAY,
      useClass: ExpoPushNotificationGateway,
    },
  ],
  exports: [PushNotificationsService],
})
export class PushNotificationsModule {}
