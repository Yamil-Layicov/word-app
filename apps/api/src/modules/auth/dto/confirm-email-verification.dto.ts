import { IsString, Matches } from 'class-validator';

const EMAIL_VERIFICATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export class ConfirmEmailVerificationDto {
  @IsString()
  @Matches(EMAIL_VERIFICATION_TOKEN_PATTERN)
  token: string;
}
