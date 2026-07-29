import { IsString, Matches, MinLength } from 'class-validator';

const PASSWORD_RESET_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export class ResetPasswordDto {
  @IsString()
  @Matches(PASSWORD_RESET_TOKEN_PATTERN)
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
