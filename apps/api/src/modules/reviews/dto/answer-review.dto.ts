import { IsBoolean, IsEnum, IsString, MaxLength } from 'class-validator';
import { ReviewRating } from '@prisma/client';

export class AnswerReviewDto {
  @IsString()
  @MaxLength(64)
  userWordId!: string;

  @IsEnum(ReviewRating)
  rating!: ReviewRating;

  @IsBoolean()
  isCorrect!: boolean;
}
