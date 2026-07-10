import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CefrLevel, WordType } from '@prisma/client';

class AddDeckWordDto {
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
}

export class AddDeckWordsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AddDeckWordDto)
  words!: AddDeckWordDto[];
}
