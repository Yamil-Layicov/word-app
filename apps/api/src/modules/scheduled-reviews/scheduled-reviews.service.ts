import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ScheduledReviewAnswerResult,
  ScheduledReviewInterval,
  UserStatus,
  UserWordStatus,
} from '@prisma/client';
import { ClockService } from '../../common/time/clock.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AnswerScheduledReviewDto } from './dto/answer-scheduled-review.dto';
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
      result: dto.result,
      currentMasteryStep: target.userWord.masteryStep,
      nextInterval: dto.nextInterval,
    });

    const result = await this.scheduledReviewsRepository.answerDueSchedule({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      scheduleId,
      answeredAt,
      answerResult: dto.result,
      isCorrect: nextState.isCorrect,
      nextStatus: nextState.nextStatus,
      nextMasteryStep: nextState.nextMasteryStep,
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
    result: ScheduledReviewAnswerResult;
    currentMasteryStep: number;
    nextInterval?: ScheduledReviewInterval;
  }): {
    isCorrect: boolean;
    nextStatus: UserWordStatus;
    nextMasteryStep: number;
    nextSchedule: {
      interval: ScheduledReviewInterval;
    } | null;
  } {
    if (input.result === ScheduledReviewAnswerResult.KNOWN) {
      if (input.nextInterval) {
        throw new BadRequestException(
          'Known words cannot have a next review interval',
        );
      }

      return {
        isCorrect: true,
        nextStatus: UserWordStatus.MASTERED,
        nextMasteryStep: MAX_MASTERY_STEP,
        nextSchedule: null,
      };
    }

    if (!input.nextInterval) {
      throw new BadRequestException(
        'Next review interval is required for this result',
      );
    }

    const isCorrect = input.result === ScheduledReviewAnswerResult.CORRECT;
    const nextMasteryStep = isCorrect
      ? Math.min(input.currentMasteryStep + 1, MAX_MASTERY_STEP)
      : Math.max(input.currentMasteryStep - 1, 0);

    return {
      isCorrect,
      nextStatus:
        nextMasteryStep >= MAX_MASTERY_STEP
          ? UserWordStatus.MASTERED
          : isCorrect
            ? UserWordStatus.REVIEWING
            : UserWordStatus.LEARNING,
      nextMasteryStep,
      nextSchedule: {
        interval: input.nextInterval,
      },
    };
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
