import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMeProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  countryCode?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  interfaceLanguage?: string;
}
