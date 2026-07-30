import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LinkGoogleAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(12000)
  idToken: string;
}
