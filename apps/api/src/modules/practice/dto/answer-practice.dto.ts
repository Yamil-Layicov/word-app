import { IsBoolean, IsEnum, IsString, MaxLength } from 'class-validator';
import { PracticeMode } from '@prisma/client';

export class AnswerPracticeDto {
  @IsString()
  @MaxLength(64)
  userWordId!: string;

  @IsBoolean()
  isCorrect!: boolean;

  @IsEnum(PracticeMode)
  practiceMode!: PracticeMode;
}
