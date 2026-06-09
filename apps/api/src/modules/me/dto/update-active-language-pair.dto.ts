import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateActiveLanguagePairDto {
  @IsString()
  @MinLength(10)
  @MaxLength(50)
  languagePairId!: string;
}
