import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class ReplaceVocabularyExampleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  sourceSentence!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  targetSentence!: string;
}

export class ReplaceVocabularyItemContentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  sourceText!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  targetText!: string;

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ReplaceVocabularyExampleDto)
  examples!: ReplaceVocabularyExampleDto[];
}
