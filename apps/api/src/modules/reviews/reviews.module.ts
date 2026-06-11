import { Module } from '@nestjs/common';
import { TimeModule } from '../../common/time/time.module';
import { AuthModule } from '../auth/auth.module';
import { ReviewsController } from './reviews.controller';
import { ReviewsRepository } from './reviews.repository';
import { ReviewsService } from './reviews.service';
import { SpacedRepetitionService } from './spaced-repetition.service';

@Module({
  imports: [AuthModule, TimeModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewsRepository, SpacedRepetitionService],
})
export class ReviewsModule {}
