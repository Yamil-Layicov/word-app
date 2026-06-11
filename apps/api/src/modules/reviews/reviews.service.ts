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
import { GetReviewTimelineQueryDto } from './dto/get-review-timeline-query.dto';
import { toAnswerReviewResponse, toDueReviewsResponse } from './reviews.mapper';
import { ReviewsRepository } from './reviews.repository';
import type {
  AnswerReviewResponse,
  DueReviewsResponse,
  ReviewTimelineResponse,
} from './reviews.types';
import { SpacedRepetitionService } from './spaced-repetition.service';

const DEFAULT_DUE_REVIEWS_LIMIT = 20;
const DEFAULT_TIMELINE_DAYS = 90;
const DEFAULT_TIME_ZONE = 'UTC';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

  async getReviewTimeline(
    currentUser: AuthenticatedUser,
    query: GetReviewTimelineQueryDto,
  ): Promise<ReviewTimelineResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );

    const now = this.clockService.now();
    const timeZone = query.timeZone ?? DEFAULT_TIME_ZONE;

    this.validateTimeZone(timeZone);

    const days = query.days ?? DEFAULT_TIMELINE_DAYS;
    const timelineEndAt = new Date(now.getTime() + days * MS_PER_DAY);
    const todayDateKey = this.toDateKey(now, timeZone);

    const items = await this.reviewsRepository.findReviewTimelineItems({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      timelineEndAt,
    });

    const groups = new Map<
      string,
      {
        date: string;
        totalWords: number;
        dueWords: number;
      }
    >();

    for (const item of items) {
      const date = item.nextReviewAt
        ? this.toDateKey(item.nextReviewAt, timeZone)
        : todayDateKey;

      const group = groups.get(date) ?? {
        date,
        totalWords: 0,
        dueWords: 0,
      };

      group.totalWords += 1;

      if (!item.nextReviewAt || item.nextReviewAt <= now) {
        group.dueWords += 1;
      }

      groups.set(date, group);
    }

    return {
      groups: [...groups.values()].sort((a, b) => a.date.localeCompare(b.date)),
    };
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

  private validateTimeZone(timeZone: string): void {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone }).format();
    } catch {
      throw new BadRequestException('Invalid time zone');
    }
  }

  private toDateKey(date: Date, timeZone: string): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (!year || !month || !day) {
      throw new BadRequestException('Invalid date format');
    }

    return `${year}-${month}-${day}`;
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
