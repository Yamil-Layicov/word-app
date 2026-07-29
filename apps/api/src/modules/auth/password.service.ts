import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  constructor(private readonly configService: ConfigService) {}

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.getSaltRounds());
  }

  verify(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  private getSaltRounds(): number {
    const rawSaltRounds = this.configService.get<string>(
      'BCRYPT_SALT_ROUNDS',
      '10',
    );
    const saltRounds = Number(rawSaltRounds);

    if (!Number.isInteger(saltRounds) || saltRounds < 8) {
      throw new Error('BCRYPT_SALT_ROUNDS must be an integer greater than 7');
    }

    return saltRounds;
  }
}
