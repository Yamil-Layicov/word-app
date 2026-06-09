import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CefrLevel } from '@prisma/client';

export class AddMeLanguagePairDto {
  @IsString()
  @MinLength(10)
  @MaxLength(50)
  languagePairId!: string;

  @IsOptional()
  @IsEnum(CefrLevel)
  targetCefrLevel?: CefrLevel;
}
