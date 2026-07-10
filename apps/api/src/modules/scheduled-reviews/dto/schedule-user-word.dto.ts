import { IsEnum, IsString, MaxLength } from 'class-validator';
import { ScheduledReviewInterval } from '@prisma/client';

export class ScheduleUserWordDto {
  @IsString()
  @MaxLength(64)
  userWordId!: string;

  @IsEnum(ScheduledReviewInterval)
  interval!: ScheduledReviewInterval;
}
