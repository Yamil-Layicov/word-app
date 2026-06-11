import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ReviewRating, UserStatus } from '@prisma/client';
import { ClockService } from '../../common/time/clock.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AnswerReviewDto } from './dto/answer-review.dto';
import { GetDueReviewsQueryDto } from './dto/get-due-reviews-query.dto';
import { GetReviewTimelineItemsQueryDto } from './dto/get-review-timeline-items-query.dto';
import { GetReviewTimelineItemsParamDto } from './dto/get-review-timeline-items-param.dto';
import { GetReviewTimelineQueryDto } from './dto/get-review-timeline-query.dto';
import {
  toAnswerReviewResponse,
  toDueReviewsResponse,
  toReviewTimelineItemsResponse,
} from './reviews.mapper';
import { ReviewsRepository } from './reviews.repository';
import type {
  AnswerReviewResponse,
  DueReviewsResponse,
  ReviewTimelineItemsResponse,
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

  async getReviewTimelineItems(
    currentUser: AuthenticatedUser,
    params: GetReviewTimelineItemsParamDto,
    query: GetReviewTimelineItemsQueryDto,
  ): Promise<ReviewTimelineItemsResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );

    const timeZone = query.timeZone ?? DEFAULT_TIME_ZONE;

    this.validateTimeZone(timeZone);
    this.validateDateKey(params.date);

    const now = this.clockService.now();
    const todayDateKey = this.toDateKey(now, timeZone);
    const { dateStartAt, dateEndAt } = this.toUtcRangeForDateKey(
      params.date,
      timeZone,
    );

    const items = await this.reviewsRepository.findReviewTimelineItemsForDate({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      dateStartAt,
      dateEndAt,
      includeUnscheduledDue: params.date === todayDateKey,
    });

    const dueWords = items.filter(
      (item) =>
        !item.userWord.nextReviewAt || item.userWord.nextReviewAt <= now,
    ).length;

    return toReviewTimelineItemsResponse({
      date: params.date,
      dueWords,
      items,
    });
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

  private validateDateKey(dateKey: string): void {
    const { year, month, day } = this.parseDateKey(dateKey);
    const date = new Date(Date.UTC(year, month - 1, day));

    const isValidDate =
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;

    if (!isValidDate) {
      throw new BadRequestException('Invalid date');
    }
  }

  private toDateKey(date: Date, timeZone: string): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = this.getDatePart(parts, 'year');
    const month = this.getDatePart(parts, 'month');
    const day = this.getDatePart(parts, 'day');

    return `${year}-${month}-${day}`;
  }

  private toUtcRangeForDateKey(
    dateKey: string,
    timeZone: string,
  ): { dateStartAt: Date; dateEndAt: Date } {
    const { year, month, day } = this.parseDateKey(dateKey);

    const nextDay = new Date(Date.UTC(year, month - 1, day) + MS_PER_DAY);

    return {
      dateStartAt: this.zonedDateTimeToUtc({
        year,
        month,
        day,
        hour: 0,
        minute: 0,
        second: 0,
        timeZone,
      }),
      dateEndAt: this.zonedDateTimeToUtc({
        year: nextDay.getUTCFullYear(),
        month: nextDay.getUTCMonth() + 1,
        day: nextDay.getUTCDate(),
        hour: 0,
        minute: 0,
        second: 0,
        timeZone,
      }),
    };
  }

  private parseDateKey(dateKey: string): {
    year: number;
    month: number;
    day: number;
  } {
    const [year, month, day] = dateKey.split('-').map(Number);

    if (!year || !month || !day) {
      throw new BadRequestException('Invalid date');
    }

    return {
      year,
      month,
      day,
    };
  }

  private zonedDateTimeToUtc(input: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    timeZone: string;
  }): Date {
    const utcTimestamp = Date.UTC(
      input.year,
      input.month - 1,
      input.day,
      input.hour,
      input.minute,
      input.second,
    );

    const firstOffset = this.getTimeZoneOffsetMs(
      new Date(utcTimestamp),
      input.timeZone,
    );

    const firstGuess = new Date(utcTimestamp - firstOffset);
    const secondOffset = this.getTimeZoneOffsetMs(firstGuess, input.timeZone);

    return new Date(utcTimestamp - secondOffset);
  }

  private getTimeZoneOffsetMs(date: Date, timeZone: string): number {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);

    const year = Number(this.getDatePart(parts, 'year'));
    const month = Number(this.getDatePart(parts, 'month'));
    const day = Number(this.getDatePart(parts, 'day'));
    const hour = Number(this.getDatePart(parts, 'hour'));
    const minute = Number(this.getDatePart(parts, 'minute'));
    const second = Number(this.getDatePart(parts, 'second'));

    const asUtcTimestamp = Date.UTC(year, month - 1, day, hour, minute, second);

    return asUtcTimestamp - date.getTime();
  }

  private getDatePart(
    parts: Intl.DateTimeFormatPart[],
    type: Intl.DateTimeFormatPart['type'],
  ): string {
    const value = parts.find((part) => part.type === type)?.value;

    if (!value) {
      throw new InternalServerErrorException('Failed to format date');
    }

    return value;
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
