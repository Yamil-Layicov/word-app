import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AnswerReviewDto } from './dto/answer-review.dto';
import { GetDueReviewsQueryDto } from './dto/get-due-reviews-query.dto';
import { GetReviewTimelineQueryDto } from './dto/get-review-timeline-query.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('due')
  @UseGuards(AccessTokenGuard)
  getDueReviews(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: GetDueReviewsQueryDto,
  ) {
    return this.reviewsService.getDueReviews(currentUser, query);
  }

  @Get('timeline')
  @UseGuards(AccessTokenGuard)
  getReviewTimeline(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: GetReviewTimelineQueryDto,
  ) {
    return this.reviewsService.getReviewTimeline(currentUser, query);
  }

  @Post('answer')
  @UseGuards(AccessTokenGuard)
  answerReview(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() answerReviewDto: AnswerReviewDto,
  ) {
    return this.reviewsService.answerReview(currentUser, answerReviewDto);
  }
}
