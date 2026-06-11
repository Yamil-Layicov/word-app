import { Injectable } from '@nestjs/common';
import { ReviewRating, UserWordStatus } from '@prisma/client';

type CalculateNextReviewInput = {
  rating: ReviewRating;
  isCorrect: boolean;
  currentEaseFactor: number;
  currentIntervalDays: number;
  answeredAt: Date;
};

export type NextReviewState = {
  nextStatus: UserWordStatus;
  nextEaseFactor: number;
  nextIntervalDays: number;
  nextReviewAt: Date;
};

const MIN_EASE_FACTOR = 1.3;
const MAX_INTERVAL_DAYS = 365;
const MASTERED_INTERVAL_THRESHOLD_DAYS = 30;

@Injectable()
export class SpacedRepetitionService {
  calculateNextReview(input: CalculateNextReviewInput): NextReviewState {
    if (!input.isCorrect || input.rating === ReviewRating.AGAIN) {
      return {
        nextStatus: UserWordStatus.LEARNING,
        nextEaseFactor: this.clampEaseFactor(input.currentEaseFactor - 0.2),
        nextIntervalDays: 0,
        nextReviewAt: this.addMinutes(input.answeredAt, 10),
      };
    }

    const nextEaseFactor = this.calculateNextEaseFactor(
      input.currentEaseFactor,
      input.rating,
    );

    const nextIntervalDays = this.calculateNextIntervalDays({
      rating: input.rating,
      currentIntervalDays: input.currentIntervalDays,
      nextEaseFactor,
    });

    return {
      nextStatus: this.calculateNextStatus(nextIntervalDays),
      nextEaseFactor,
      nextIntervalDays,
      nextReviewAt: this.addDays(input.answeredAt, nextIntervalDays),
    };
  }

  private calculateNextEaseFactor(
    currentEaseFactor: number,
    rating: ReviewRating,
  ): number {
    if (rating === ReviewRating.HARD) {
      return this.clampEaseFactor(currentEaseFactor - 0.15);
    }

    if (rating === ReviewRating.EASY) {
      return this.clampEaseFactor(currentEaseFactor + 0.15);
    }

    return this.clampEaseFactor(currentEaseFactor);
  }

  private calculateNextIntervalDays(input: {
    rating: ReviewRating;
    currentIntervalDays: number;
    nextEaseFactor: number;
  }): number {
    const currentIntervalDays = Math.max(0, input.currentIntervalDays);

    if (input.rating === ReviewRating.HARD) {
      return 1;
    }

    if (input.rating === ReviewRating.EASY) {
      const nextInterval =
        currentIntervalDays === 0
          ? 4
          : Math.round(currentIntervalDays * input.nextEaseFactor * 1.3);

      return this.clampIntervalDays(nextInterval);
    }

    const nextInterval =
      currentIntervalDays === 0
        ? 1
        : Math.round(currentIntervalDays * input.nextEaseFactor);

    return this.clampIntervalDays(nextInterval);
  }

  private calculateNextStatus(nextIntervalDays: number): UserWordStatus {
    if (nextIntervalDays >= MASTERED_INTERVAL_THRESHOLD_DAYS) {
      return UserWordStatus.MASTERED;
    }

    return UserWordStatus.REVIEWING;
  }

  private clampEaseFactor(value: number): number {
    return Math.max(MIN_EASE_FACTOR, Number(value.toFixed(2)));
  }

  private clampIntervalDays(value: number): number {
    return Math.min(Math.max(0, value), MAX_INTERVAL_DAYS);
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }
}
