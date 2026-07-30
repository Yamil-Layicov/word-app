import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(12000)
  idToken: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  languagePairId?: string;
}
