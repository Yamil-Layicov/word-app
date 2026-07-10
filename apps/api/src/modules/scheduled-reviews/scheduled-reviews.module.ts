import { Module } from '@nestjs/common';
import { TimeModule } from '../../common/time/time.module';
import { AuthModule } from '../auth/auth.module';
import { ScheduledReviewsController } from './scheduled-reviews.controller';
import { ScheduledReviewsRepository } from './scheduled-reviews.repository';
import { ScheduledReviewsService } from './scheduled-reviews.service';

@Module({
  imports: [AuthModule, TimeModule],
  controllers: [ScheduledReviewsController],
  providers: [ScheduledReviewsService, ScheduledReviewsRepository],
})
export class ScheduledReviewsModule {}
