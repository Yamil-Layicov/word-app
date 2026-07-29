/// <reference types="jest" />

import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const password = 'secure-password';

  function createService(saltRounds = '8'): PasswordService {
    const configService = {
      get: jest.fn().mockReturnValue(saltRounds),
    } as unknown as ConfigService;

    return new PasswordService(configService);
  }

  it('hashes and verifies passwords with the configured work factor', async () => {
    const service = createService();

    const passwordHash = await service.hash(password);

    await expect(service.verify(password, passwordHash)).resolves.toBe(true);
    await expect(service.verify('wrong-password', passwordHash)).resolves.toBe(
      false,
    );
    expect(bcrypt.getRounds(passwordHash)).toBe(8);
  });

  it.each(['7', 'invalid', '8.5'])(
    'rejects an invalid bcrypt work factor: %s',
    async (saltRounds) => {
      const service = createService(saltRounds);

      await expect(service.hash(password)).rejects.toThrow(
        'BCRYPT_SALT_ROUNDS must be an integer greater than 7',
      );
    },
  );
});
