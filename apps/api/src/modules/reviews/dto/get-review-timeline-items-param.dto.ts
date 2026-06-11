import { Matches } from 'class-validator';

export class GetReviewTimelineItemsParamDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format',
  })
  date!: string;
}
