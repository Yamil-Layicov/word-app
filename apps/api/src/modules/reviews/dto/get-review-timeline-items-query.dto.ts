import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GetReviewTimelineItemsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timeZone?: string;
}
