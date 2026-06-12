/// <reference types="jest" />

/**
 * Bu test faylı SpacedRepetitionService üçün unit test-lər saxlayır.
 *
 * Niyə unit test?
 * - Bu service database istifadə etmir.
 * - Repository mock lazım deyil.
 * - Sadəcə SRS hesablama logic-i yoxlanılır.
 *
 * Məqsəd:
 * ReviewRating dəyişəndə status, easeFactor, intervalDays və nextReviewAt
 * düzgün hesablanırmı, onu qorumaq.
 */
import { ReviewRating, UserWordStatus } from '@prisma/client';
import { SpacedRepetitionService } from './spaced-repetition.service';

describe('SpacedRepetitionService', () => {
  let service: SpacedRepetitionService;

  /**
   * Bütün testlər eyni sabit tarixdən başlayır.
   * Bu, nextReviewAt nəticələrini deterministic edir.
   */
  const answeredAt = new Date('2026-06-12T10:00:00.000Z');

  beforeEach(() => {
    service = new SpacedRepetitionService();
  });

  /**
   * AGAIN və ya səhv cavab official review flow-da sözü yenidən LEARNING statusuna salmalıdır.
   * Buna görə interval 0 olur və söz 10 dəqiqə sonra yenidən review üçün gəlir.
   */
  it('should schedule AGAIN answers for learning again in 10 minutes', () => {
    const result = service.calculateNextReview({
      rating: ReviewRating.AGAIN,
      isCorrect: false,
      currentEaseFactor: 2.5,
      currentIntervalDays: 5,
      answeredAt,
    });

    expect(result).toEqual({
      nextStatus: UserWordStatus.LEARNING,
      nextEaseFactor: 2.3,
      nextIntervalDays: 0,
      nextReviewAt: new Date('2026-06-12T10:10:00.000Z'),
    });
  });

  /**
   * isCorrect=false gələndə rating AGAIN olmasa belə nəticə AGAIN kimi davranmalıdır.
   * Bu test səhv cavabların SRS-də irəli getməsinin qarşısını qoruyur.
   */
  it('should treat incorrect non-AGAIN answers as learning again', () => {
    const result = service.calculateNextReview({
      rating: ReviewRating.EASY,
      isCorrect: false,
      currentEaseFactor: 2.5,
      currentIntervalDays: 10,
      answeredAt,
    });

    expect(result.nextStatus).toBe(UserWordStatus.LEARNING);
    expect(result.nextEaseFactor).toBe(2.3);
    expect(result.nextIntervalDays).toBe(0);
    expect(result.nextReviewAt).toEqual(new Date('2026-06-12T10:10:00.000Z'));
  });

  /**
   * HARD cavabında söz doğru cavablanıb, amma çətin sayılır.
   * Ona görə interval 1 gün olur və easeFactor bir az azalır.
   */
  it('should schedule HARD answers for 1 day and reduce ease factor', () => {
    const result = service.calculateNextReview({
      rating: ReviewRating.HARD,
      isCorrect: true,
      currentEaseFactor: 2.5,
      currentIntervalDays: 5,
      answeredAt,
    });

    expect(result.nextStatus).toBe(UserWordStatus.REVIEWING);
    expect(result.nextEaseFactor).toBe(2.35);
    expect(result.nextIntervalDays).toBe(1);
    expect(result.nextReviewAt).toEqual(new Date('2026-06-13T10:00:00.000Z'));
  });

  /**
   * GOOD cavabı normal uğurlu review sayılır.
   * Mövcud interval easeFactor ilə vurulub növbəti interval hesablanmalıdır.
   */
  it('should increase interval for GOOD answers using ease factor', () => {
    const result = service.calculateNextReview({
      rating: ReviewRating.GOOD,
      isCorrect: true,
      currentEaseFactor: 2.5,
      currentIntervalDays: 4,
      answeredAt,
    });

    expect(result.nextStatus).toBe(UserWordStatus.REVIEWING);
    expect(result.nextEaseFactor).toBe(2.5);
    expect(result.nextIntervalDays).toBe(10);
    expect(result.nextReviewAt).toEqual(new Date('2026-06-22T10:00:00.000Z'));
  });

  /**
   * GOOD cavabı ilk dəfə review olunanda currentIntervalDays 0 ola bilər.
   * Bu halda ilk interval 1 gün olmalıdır.
   */
  it('should schedule first GOOD answer for 1 day when current interval is 0', () => {
    const result = service.calculateNextReview({
      rating: ReviewRating.GOOD,
      isCorrect: true,
      currentEaseFactor: 2.5,
      currentIntervalDays: 0,
      answeredAt,
    });

    expect(result.nextStatus).toBe(UserWordStatus.REVIEWING);
    expect(result.nextEaseFactor).toBe(2.5);
    expect(result.nextIntervalDays).toBe(1);
    expect(result.nextReviewAt).toEqual(new Date('2026-06-13T10:00:00.000Z'));
  });

  /**
   * EASY cavabı sözün çox rahat bilindiyini göstərir.
   * Ona görə GOOD-dan daha böyük interval verməlidir və easeFactor bir az artmalıdır.
   */
  it('should increase interval more aggressively for EASY answers', () => {
    const result = service.calculateNextReview({
      rating: ReviewRating.EASY,
      isCorrect: true,
      currentEaseFactor: 2.5,
      currentIntervalDays: 4,
      answeredAt,
    });

    expect(result.nextStatus).toBe(UserWordStatus.REVIEWING);
    expect(result.nextEaseFactor).toBe(2.65);
    expect(result.nextIntervalDays).toBe(14);
    expect(result.nextReviewAt).toEqual(new Date('2026-06-26T10:00:00.000Z'));
  });

  /**
   * EASY cavabı ilk dəfə review olunanda currentIntervalDays 0 ola bilər.
   * Bu halda başlanğıc interval 4 gün olmalıdır.
   */
  it('should schedule first EASY answer for 4 days when current interval is 0', () => {
    const result = service.calculateNextReview({
      rating: ReviewRating.EASY,
      isCorrect: true,
      currentEaseFactor: 2.5,
      currentIntervalDays: 0,
      answeredAt,
    });

    expect(result.nextStatus).toBe(UserWordStatus.REVIEWING);
    expect(result.nextEaseFactor).toBe(2.65);
    expect(result.nextIntervalDays).toBe(4);
    expect(result.nextReviewAt).toEqual(new Date('2026-06-16T10:00:00.000Z'));
  });

  /**
   * easeFactor çox aşağı düşməməlidir.
   * Bu test MIN_EASE_FACTOR limitinin qorunduğunu yoxlayır.
   */
  it('should not reduce ease factor below the minimum value', () => {
    const result = service.calculateNextReview({
      rating: ReviewRating.AGAIN,
      isCorrect: false,
      currentEaseFactor: 1.3,
      currentIntervalDays: 5,
      answeredAt,
    });

    expect(result.nextEaseFactor).toBe(1.3);
  });

  /**
   * interval çox böyüyəndə maksimum limitdən yuxarı çıxmamalıdır.
   * Bu test MAX_INTERVAL_DAYS limitinin qorunduğunu yoxlayır.
   */
  it('should not increase interval above the maximum value', () => {
    const result = service.calculateNextReview({
      rating: ReviewRating.EASY,
      isCorrect: true,
      currentEaseFactor: 2.5,
      currentIntervalDays: 300,
      answeredAt,
    });

    expect(result.nextIntervalDays).toBe(365);
    expect(result.nextReviewAt).toEqual(new Date('2027-06-12T10:00:00.000Z'));
  });

  /**
   * interval 30 gün və ya daha çox olarsa söz MASTERED sayılır.
   * Bu test official mastery threshold davranışını qoruyur.
   */
  it('should mark the word as mastered when interval reaches the mastered threshold', () => {
    const result = service.calculateNextReview({
      rating: ReviewRating.GOOD,
      isCorrect: true,
      currentEaseFactor: 2.5,
      currentIntervalDays: 12,
      answeredAt,
    });

    expect(result.nextStatus).toBe(UserWordStatus.MASTERED);
    expect(result.nextIntervalDays).toBe(30);
  });
});
