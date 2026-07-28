import { Module } from '@nestjs/common';
import { TimeModule } from '../../common/time/time.module';
import { AuthModule } from '../auth/auth.module';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';
import { ScheduledReviewNotificationScanner } from './scheduled-review-notification.scanner';
import { ScheduledReviewNotificationsRepository } from './scheduled-review-notifications.repository';
import { ScheduledReviewsController } from './scheduled-reviews.controller';
import { ScheduledReviewsRepository } from './scheduled-reviews.repository';
import { ScheduledReviewsService } from './scheduled-reviews.service';

@Module({
  imports: [AuthModule, TimeModule, PushNotificationsModule],
  controllers: [ScheduledReviewsController],
  providers: [
    ScheduledReviewsService,
    ScheduledReviewsRepository,
    ScheduledReviewNotificationScanner,
    ScheduledReviewNotificationsRepository,
  ],
})
export class ScheduledReviewsModule {}
