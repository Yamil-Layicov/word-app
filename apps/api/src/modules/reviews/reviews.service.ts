import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ReviewRating, UserStatus } from '@prisma/client';
import { ClockService } from '../../common/time/clock.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AnswerReviewDto } from './dto/answer-review.dto';
import { GetDueReviewsQueryDto } from './dto/get-due-reviews-query.dto';
import { toAnswerReviewResponse, toDueReviewsResponse } from './reviews.mapper';
import { ReviewsRepository } from './reviews.repository';
import type { AnswerReviewResponse, DueReviewsResponse } from './reviews.types';
import { SpacedRepetitionService } from './spaced-repetition.service';

const DEFAULT_DUE_REVIEWS_LIMIT = 20;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    private readonly spacedRepetitionService: SpacedRepetitionService,
    private readonly clockService: ClockService,
  ) {}

  async getDueReviews(
    currentUser: AuthenticatedUser,
    query: GetDueReviewsQueryDto,
  ): Promise<DueReviewsResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );

    const items = await this.reviewsRepository.findDueReviewItems({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      now: this.clockService.now(),
      limit: query.limit ?? DEFAULT_DUE_REVIEWS_LIMIT,
    });

    return toDueReviewsResponse(items);
  }

  async answerReview(
    currentUser: AuthenticatedUser,
    answerReviewDto: AnswerReviewDto,
  ): Promise<AnswerReviewResponse> {
    this.validateReviewAnswer(answerReviewDto);

    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );

    const answeredAt = this.clockService.now();

    const reviewTarget = await this.reviewsRepository.findReviewTarget({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      userWordId: answerReviewDto.userWordId,
      now: answeredAt,
    });

    if (!reviewTarget) {
      throw new NotFoundException('Review item not found');
    }

    const nextReviewState = this.spacedRepetitionService.calculateNextReview({
      rating: answerReviewDto.rating,
      isCorrect: answerReviewDto.isCorrect,
      currentEaseFactor: reviewTarget.userWord.easeFactor,
      currentIntervalDays: reviewTarget.userWord.intervalDays,
      answeredAt,
    });

    const result = await this.reviewsRepository.answerReview({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      userWordId: answerReviewDto.userWordId,
      rating: answerReviewDto.rating,
      isCorrect: answerReviewDto.isCorrect,
      answeredAt,
      nextStatus: nextReviewState.nextStatus,
      nextEaseFactor: nextReviewState.nextEaseFactor,
      nextIntervalDays: nextReviewState.nextIntervalDays,
      nextReviewAt: nextReviewState.nextReviewAt,
    });

    if (!result) {
      throw new NotFoundException('Review item not found');
    }

    return toAnswerReviewResponse(result);
  }

  private validateReviewAnswer(answerReviewDto: AnswerReviewDto): void {
    if (
      !answerReviewDto.isCorrect &&
      answerReviewDto.rating !== ReviewRating.AGAIN
    ) {
      throw new BadRequestException('Incorrect answers must use AGAIN rating');
    }

    if (
      answerReviewDto.isCorrect &&
      answerReviewDto.rating === ReviewRating.AGAIN
    ) {
      throw new BadRequestException('Correct answers cannot use AGAIN rating');
    }
  }

  private async getActiveLanguagePairId(userId: string): Promise<string> {
    const userContext = await this.reviewsRepository.findUserContext(userId);

    if (!userContext) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (userContext.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }

    const activeLanguagePairId = userContext.profile?.activeLanguagePairId;

    if (!activeLanguagePairId) {
      throw new BadRequestException('Active language pair is not selected');
    }

    const activeUserLanguagePair = userContext.languagePairs.find(
      (userLanguagePair) =>
        userLanguagePair.languagePairId === activeLanguagePairId,
    );

    if (!activeUserLanguagePair) {
      throw new BadRequestException('Active language pair is not available');
    }

    if (!activeUserLanguagePair.isLearning) {
      throw new BadRequestException('Active language pair is not enabled');
    }

    if (!activeUserLanguagePair.languagePair.isActive) {
      throw new BadRequestException('Active language pair is not active');
    }

    return activeLanguagePairId;
  }
}
