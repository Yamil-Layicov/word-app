import {
  PracticeMode,
  ScheduledReviewAnswerResult,
  ScheduledReviewInterval,
} from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class AnswerScheduledReviewDto {
  @IsEnum(PracticeMode)
  practiceMode!: PracticeMode;

  @IsEnum(ScheduledReviewAnswerResult)
  result!: ScheduledReviewAnswerResult;

  @IsOptional()
  @IsEnum(ScheduledReviewInterval)
  nextInterval?: ScheduledReviewInterval;
}
