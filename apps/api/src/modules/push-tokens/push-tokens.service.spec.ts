/// <reference types="jest" />

import { PushPlatform, UserRole, UserStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PushTokensRepository } from './push-tokens.repository';
import { PushTokensService } from './push-tokens.service';

const currentUser: AuthenticatedUser = {
  id: 'user-1',
  email: 'user@example.com',
  role: UserRole.USER,
};

const registerDto = {
  token: 'ExponentPushToken[test-token]',
  platform: PushPlatform.ANDROID,
};

describe('PushTokensService', () => {
  let repository: jest.Mocked<PushTokensRepository>;
  let findUserStatusMock: jest.Mock;
  let findEnabledTokensByUserIdMock: jest.Mock;
  let registerMock: jest.Mock;
  let service: PushTokensService;

  beforeEach(() => {
    findUserStatusMock = jest.fn().mockResolvedValue(UserStatus.ACTIVE);
    findEnabledTokensByUserIdMock = jest.fn().mockResolvedValue([]);
    registerMock = jest.fn().mockResolvedValue(undefined);

    repository = {
      findUserStatus: findUserStatusMock,
      findEnabledTokensByUserId: findEnabledTokensByUserIdMock,
      register: registerMock,
    } as unknown as jest.Mocked<PushTokensRepository>;

    service = new PushTokensService(repository);
  });

  it('registers a token for an active user', async () => {
    await service.register(currentUser, registerDto);

    expect(registerMock).toHaveBeenCalledWith({
      userId: currentUser.id,
      token: registerDto.token,
      platform: PushPlatform.ANDROID,
    });
  });

  it('rejects a missing user', async () => {
    findUserStatusMock.mockResolvedValue(null);

    await expect(service.register(currentUser, registerDto)).rejects.toThrow(
      'Unauthorized',
    );
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('rejects an inactive user', async () => {
    findUserStatusMock.mockResolvedValue(UserStatus.BLOCKED);

    await expect(service.register(currentUser, registerDto)).rejects.toThrow(
      'Account is not active',
    );
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('returns enabled tokens for an internal notification sender', async () => {
    findEnabledTokensByUserIdMock.mockResolvedValue([
      'ExponentPushToken[device-1]',
    ]);

    await expect(
      service.getEnabledTokensForUser(currentUser.id),
    ).resolves.toEqual(['ExponentPushToken[device-1]']);
    expect(findEnabledTokensByUserIdMock).toHaveBeenCalledWith(currentUser.id);
  });
});
