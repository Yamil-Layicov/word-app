import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CefrLevel, WordType } from '@prisma/client';

class CreateVocabularyExampleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  sourceSentence!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  targetSentence!: string;
}

export class CreateVocabularyItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  sourceText!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  targetText!: string;

  @IsOptional()
  @IsEnum(WordType)
  wordType?: WordType;

  @IsOptional()
  @IsEnum(CefrLevel)
  cefrLevel?: CefrLevel;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  definition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => CreateVocabularyExampleDto)
  examples?: CreateVocabularyExampleDto[];
}
