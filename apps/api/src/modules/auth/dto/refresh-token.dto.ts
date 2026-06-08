import { IsString, MaxLength, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @MinLength(100)
  @MaxLength(300)
  refreshToken!: string;
}
