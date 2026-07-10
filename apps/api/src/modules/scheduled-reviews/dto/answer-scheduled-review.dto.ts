import { IsEnum } from 'class-validator';

export enum ScheduledReviewAnswerQuality {
  AGAIN = 'AGAIN',
  HARD = 'HARD',
  GOOD = 'GOOD',
  EASY = 'EASY',
  KNOWN = 'KNOWN',
}

export class AnswerScheduledReviewDto {
  @IsEnum(ScheduledReviewAnswerQuality)
  quality!: ScheduledReviewAnswerQuality;
}
