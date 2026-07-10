import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDeckDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
