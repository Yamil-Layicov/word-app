/// <reference types="jest" />

import { ClockService } from '../../common/time/clock.service';
import { PasswordResetRepository } from './password-reset.repository';
import { PasswordResetEmailDispatcher } from './password-reset-email.dispatcher';
import {
  INVALID_PASSWORD_RESET_TOKEN_MESSAGE,
  PASSWORD_RESET_REQUEST_MESSAGE,
  PASSWORD_RESET_SUCCESS_MESSAGE,
  PasswordResetService,
} from './password-reset.service';
import { PasswordResetTokenService } from './password-reset-token.service';
import { PasswordService } from './password.service';

const issuedToken = {
  rawToken: 'raw-reset-token',
  tokenHash: 'hashed-reset-token',
  expiresAt: new Date('2026-07-29T08:30:00.000Z'),
};
const now = new Date('2026-07-29T08:00:00.000Z');

describe('PasswordResetService', () => {
  let findResettableUserByEmailMock: jest.Mock;
  let replaceTokenMock: jest.Mock;
  let consumeTokenAndResetPasswordMock: jest.Mock;
  let issueTokenMock: jest.Mock;
  let hashTokenMock: jest.Mock;
  let hashPasswordMock: jest.Mock;
  let dispatchEmailMock: jest.Mock;
  let service: PasswordResetService;

  beforeEach(() => {
    findResettableUserByEmailMock = jest.fn();
    replaceTokenMock = jest.fn();
    consumeTokenAndResetPasswordMock = jest.fn();
    issueTokenMock = jest.fn().mockReturnValue(issuedToken);
    hashTokenMock = jest.fn().mockReturnValue('hashed-input-token');
    hashPasswordMock = jest.fn().mockResolvedValue('hashed-new-password');
    dispatchEmailMock = jest.fn().mockResolvedValue(undefined);

    const repository = {
      findResettableUserByEmail: findResettableUserByEmailMock,
      replaceToken: replaceTokenMock,
      consumeTokenAndResetPassword: consumeTokenAndResetPasswordMock,
    } as unknown as PasswordResetRepository;
    const tokenService = {
      issue: issueTokenMock,
      hash: hashTokenMock,
    } as unknown as PasswordResetTokenService;
    const emailDispatcher = {
      dispatch: dispatchEmailMock,
    } as unknown as PasswordResetEmailDispatcher;
    const passwordService = {
      hash: hashPasswordMock,
    } as unknown as PasswordService;
    const clockService = {
      now: jest.fn().mockReturnValue(now),
    } as unknown as ClockService;

    service = new PasswordResetService(
      repository,
      tokenService,
      emailDispatcher,
      passwordService,
      clockService,
    );
  });

  it('replaces the current token for an existing active account', async () => {
    findResettableUserByEmailMock.mockResolvedValue({
      id: 'user-1',
    });

    await expect(service.request('  User@Example.COM ')).resolves.toEqual({
      message: PASSWORD_RESET_REQUEST_MESSAGE,
    });
    expect(findResettableUserByEmailMock).toHaveBeenCalledWith(
      'user@example.com',
    );
    expect(replaceTokenMock).toHaveBeenCalledWith({
      userId: 'user-1',
      tokenHash: issuedToken.tokenHash,
      expiresAt: issuedToken.expiresAt,
    });
    expect(dispatchEmailMock).toHaveBeenCalledWith({
      to: 'user@example.com',
      rawToken: issuedToken.rawToken,
      tokenHash: issuedToken.tokenHash,
      expiresAt: issuedToken.expiresAt,
    });
  });

  it('returns the same response without storing a token for an unknown email', async () => {
    findResettableUserByEmailMock.mockResolvedValue(null);

    await expect(service.request('missing@example.com')).resolves.toEqual({
      message: PASSWORD_RESET_REQUEST_MESSAGE,
    });
    expect(issueTokenMock).toHaveBeenCalledTimes(1);
    expect(replaceTokenMock).not.toHaveBeenCalled();
    expect(dispatchEmailMock).not.toHaveBeenCalled();
  });

  it('consumes a valid token and resets the password', async () => {
    consumeTokenAndResetPasswordMock.mockResolvedValue(true);

    await expect(
      service.reset('raw-input-token', 'new-password'),
    ).resolves.toEqual({
      message: PASSWORD_RESET_SUCCESS_MESSAGE,
    });
    expect(hashTokenMock).toHaveBeenCalledWith('raw-input-token');
    expect(hashPasswordMock).toHaveBeenCalledWith('new-password');
    expect(consumeTokenAndResetPasswordMock).toHaveBeenCalledWith({
      tokenHash: 'hashed-input-token',
      passwordHash: 'hashed-new-password',
      now,
    });
  });

  it('rejects an invalid, expired, or consumed token with one safe message', async () => {
    consumeTokenAndResetPasswordMock.mockResolvedValue(false);

    await expect(
      service.reset('raw-input-token', 'new-password'),
    ).rejects.toMatchObject({
      message: INVALID_PASSWORD_RESET_TOKEN_MESSAGE,
    });
    expect(hashPasswordMock).toHaveBeenCalledWith('new-password');
  });
});
