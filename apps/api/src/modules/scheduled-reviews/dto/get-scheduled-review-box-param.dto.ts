import { IsEnum } from 'class-validator';
import { ScheduledReviewInterval } from '@prisma/client';

export class GetScheduledReviewBoxParamDto {
  @IsEnum(ScheduledReviewInterval)
  interval!: ScheduledReviewInterval;
}
