import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ScheduledReviewInterval,
  UserStatus,
  UserWordStatus,
} from '@prisma/client';
import { ClockService } from '../../common/time/clock.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  AnswerScheduledReviewDto,
  ScheduledReviewAnswerQuality,
} from './dto/answer-scheduled-review.dto';
import { GetScheduledReviewBoxParamDto } from './dto/get-scheduled-review-box-param.dto';
import { ScheduleUserWordDto } from './dto/schedule-user-word.dto';
import {
  toScheduledReviewAnswerResponse,
  toScheduledReviewBoxDetailResponse,
  toScheduledReviewBoxesResponse,
  toScheduledReviewItemsResponse,
  toScheduledReviewItemResponse,
} from './scheduled-reviews.mapper';
import { ScheduledReviewsRepository } from './scheduled-reviews.repository';
import type {
  ScheduledReviewAnswerResponse,
  ScheduledReviewBoxDetailResponse,
  ScheduledReviewBoxesResponse,
  ScheduledReviewItemsResponse,
  ScheduledReviewItemResponse,
} from './scheduled-reviews.types';

const MAX_MASTERY_STEP = 5;
const MASTERED_HOLD_DAYS = 365;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

@Injectable()
export class ScheduledReviewsService {
  constructor(
    private readonly scheduledReviewsRepository: ScheduledReviewsRepository,
    private readonly clockService: ClockService,
  ) {}

  async getBoxes(
    currentUser: AuthenticatedUser,
  ): Promise<ScheduledReviewBoxesResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );
    const now = this.clockService.now();
    const items = await this.scheduledReviewsRepository.findActiveSchedules({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
    });

    return toScheduledReviewBoxesResponse({ items, now });
  }

  async getActiveSchedules(
    currentUser: AuthenticatedUser,
  ): Promise<ScheduledReviewItemsResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );
    const now = this.clockService.now();
    const items = await this.scheduledReviewsRepository.findActiveSchedules({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
    });

    return toScheduledReviewItemsResponse({ items, now });
  }

  async getBoxDetail(
    currentUser: AuthenticatedUser,
    params: GetScheduledReviewBoxParamDto,
  ): Promise<ScheduledReviewBoxDetailResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );
    const now = this.clockService.now();
    const items = await this.scheduledReviewsRepository.findActiveSchedules({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      interval: params.interval,
    });

    return toScheduledReviewBoxDetailResponse({
      interval: params.interval,
      items,
      now,
    });
  }

  async scheduleUserWord(
    currentUser: AuthenticatedUser,
    dto: ScheduleUserWordDto,
  ): Promise<ScheduledReviewItemResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );
    const result = await this.scheduledReviewsRepository.scheduleUserWord({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      userWordId: dto.userWordId,
      interval: dto.interval,
    });

    if (!result) {
      throw new NotFoundException('Vocabulary word not found');
    }

    return toScheduledReviewItemResponse(result, this.clockService.now());
  }

  async startBox(
    currentUser: AuthenticatedUser,
    params: GetScheduledReviewBoxParamDto,
  ): Promise<ScheduledReviewBoxDetailResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );
    const startedAt = this.clockService.now();
    const dueAt = this.addInterval(startedAt, params.interval);

    const items = await this.scheduledReviewsRepository.startQueuedBox({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      interval: params.interval,
      startedAt,
      dueAt,
    });

    return toScheduledReviewBoxDetailResponse({
      interval: params.interval,
      items,
      now: startedAt,
    });
  }

  async answerSchedule(
    currentUser: AuthenticatedUser,
    scheduleId: string,
    dto: AnswerScheduledReviewDto,
  ): Promise<ScheduledReviewAnswerResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );
    const answeredAt = this.clockService.now();

    const target = await this.scheduledReviewsRepository.findDueSchedule({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      scheduleId,
      now: answeredAt,
    });

    if (!target) {
      throw new NotFoundException('Due scheduled review not found');
    }

    const nextState = this.calculateNextState({
      quality: dto.quality,
      currentMasteryStep: target.userWord.masteryStep,
      answeredAt,
    });

    const result = await this.scheduledReviewsRepository.answerDueSchedule({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      scheduleId,
      answeredAt,
      isCorrect: nextState.isCorrect,
      nextStatus: nextState.nextStatus,
      nextMasteryStep: nextState.nextMasteryStep,
      nextIntervalDays: nextState.nextIntervalDays,
      nextReviewAt: nextState.nextReviewAt,
      nextSchedule: nextState.nextSchedule,
    });

    if (!result) {
      throw new NotFoundException('Due scheduled review not found');
    }

    return toScheduledReviewAnswerResponse(result, answeredAt);
  }

  async cancelSchedule(
    currentUser: AuthenticatedUser,
    scheduleId: string,
  ): Promise<void> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );
    const cancelled = await this.scheduledReviewsRepository.cancelSchedule({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      scheduleId,
      cancelledAt: this.clockService.now(),
    });

    if (!cancelled) {
      throw new NotFoundException('Scheduled review not found');
    }
  }

  private calculateNextState(input: {
    quality: ScheduledReviewAnswerQuality;
    currentMasteryStep: number;
    answeredAt: Date;
  }): {
    isCorrect: boolean;
    nextStatus: UserWordStatus;
    nextMasteryStep: number;
    nextIntervalDays: number;
    nextReviewAt: Date;
    nextSchedule: {
      interval: ScheduledReviewInterval;
      dueAt: Date;
    } | null;
  } {
    if (input.quality === ScheduledReviewAnswerQuality.KNOWN) {
      return {
        isCorrect: true,
        nextStatus: UserWordStatus.MASTERED,
        nextMasteryStep: MAX_MASTERY_STEP,
        nextIntervalDays: MASTERED_HOLD_DAYS,
        nextReviewAt: this.addDays(input.answeredAt, MASTERED_HOLD_DAYS),
        nextSchedule: null,
      };
    }

    if (input.quality === ScheduledReviewAnswerQuality.AGAIN) {
      const nextInterval = ScheduledReviewInterval.ONE_HOUR;
      const dueAt = this.addInterval(input.answeredAt, nextInterval);

      return {
        isCorrect: false,
        nextStatus: UserWordStatus.LEARNING,
        nextMasteryStep: Math.max(input.currentMasteryStep - 1, 0),
        nextIntervalDays: this.getIntervalDays(nextInterval),
        nextReviewAt: dueAt,
        nextSchedule: {
          interval: nextInterval,
          dueAt,
        },
      };
    }

    const nextInterval = this.getNextIntervalForQuality(input.quality);
    const isCorrect = true;
    const nextMasteryStep = Math.min(
      input.currentMasteryStep + 1,
      MAX_MASTERY_STEP,
    );

    if (nextMasteryStep >= MAX_MASTERY_STEP) {
      return {
        isCorrect,
        nextStatus: UserWordStatus.MASTERED,
        nextMasteryStep,
        nextIntervalDays: MASTERED_HOLD_DAYS,
        nextReviewAt: this.addDays(input.answeredAt, MASTERED_HOLD_DAYS),
        nextSchedule: null,
      };
    }

    const dueAt = this.addInterval(input.answeredAt, nextInterval);

    return {
      isCorrect,
      nextStatus: isCorrect
        ? UserWordStatus.REVIEWING
        : UserWordStatus.LEARNING,
      nextMasteryStep,
      nextIntervalDays: this.getIntervalDays(nextInterval),
      nextReviewAt: dueAt,
      nextSchedule: {
        interval: nextInterval,
        dueAt,
      },
    };
  }

  private getNextIntervalForQuality(
    quality: ScheduledReviewAnswerQuality,
  ): ScheduledReviewInterval {
    switch (quality) {
      case ScheduledReviewAnswerQuality.AGAIN:
        return ScheduledReviewInterval.ONE_HOUR;
      case ScheduledReviewAnswerQuality.HARD:
        return ScheduledReviewInterval.SIX_HOURS;
      case ScheduledReviewAnswerQuality.GOOD:
        return ScheduledReviewInterval.ONE_DAY;
      case ScheduledReviewAnswerQuality.EASY:
        return ScheduledReviewInterval.THREE_DAYS;
      default:
        throw new BadRequestException('Unsupported scheduled review answer');
    }
  }

  private getIntervalDays(interval: ScheduledReviewInterval): number {
    switch (interval) {
      case ScheduledReviewInterval.ONE_HOUR:
      case ScheduledReviewInterval.SIX_HOURS:
        return 0;
      case ScheduledReviewInterval.ONE_DAY:
        return 1;
      case ScheduledReviewInterval.THREE_DAYS:
        return 3;
      case ScheduledReviewInterval.ONE_WEEK:
        return 7;
    }
  }

  private addInterval(date: Date, interval: ScheduledReviewInterval): Date {
    switch (interval) {
      case ScheduledReviewInterval.ONE_HOUR:
        return new Date(date.getTime() + MS_PER_HOUR);
      case ScheduledReviewInterval.SIX_HOURS:
        return new Date(date.getTime() + 6 * MS_PER_HOUR);
      case ScheduledReviewInterval.ONE_DAY:
        return this.addDays(date, 1);
      case ScheduledReviewInterval.THREE_DAYS:
        return this.addDays(date, 3);
      case ScheduledReviewInterval.ONE_WEEK:
        return this.addDays(date, 7);
    }
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * MS_PER_DAY);
  }

  private async getActiveLanguagePairId(userId: string): Promise<string> {
    const userContext =
      await this.scheduledReviewsRepository.findUserContext(userId);

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
