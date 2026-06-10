import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UserWordStatus } from '@prisma/client';

export class UpdateUserVocabularyItemDto {
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @IsEnum(UserWordStatus)
  status?: UserWordStatus;
}
