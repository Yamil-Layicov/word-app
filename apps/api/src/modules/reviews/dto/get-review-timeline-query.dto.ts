import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class GetReviewTimelineQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timeZone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(730)
  days?: number;
}
