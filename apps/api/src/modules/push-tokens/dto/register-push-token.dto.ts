import { PushPlatform } from '@prisma/client';
import { IsEnum, IsString, Matches, MaxLength } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @MaxLength(255)
  @Matches(/^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]+\]$/)
  token!: string;

  @IsEnum(PushPlatform)
  platform!: PushPlatform;
}
