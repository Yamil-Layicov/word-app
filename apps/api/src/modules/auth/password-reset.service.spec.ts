/// <reference types="jest" />

import { PasswordResetRepository } from './password-reset.repository';
import { PasswordResetEmailDispatcher } from './password-reset-email.dispatcher';
import {
  PASSWORD_RESET_REQUEST_MESSAGE,
  PasswordResetService,
} from './password-reset.service';
import { PasswordResetTokenService } from './password-reset-token.service';

const issuedToken = {
  rawToken: 'raw-reset-token',
  tokenHash: 'hashed-reset-token',
  expiresAt: new Date('2026-07-29T08:30:00.000Z'),
};

describe('PasswordResetService', () => {
  let findResettableUserByEmailMock: jest.Mock;
  let replaceTokenMock: jest.Mock;
  let issueTokenMock: jest.Mock;
  let dispatchEmailMock: jest.Mock;
  let service: PasswordResetService;

  beforeEach(() => {
    findResettableUserByEmailMock = jest.fn();
    replaceTokenMock = jest.fn();
    issueTokenMock = jest.fn().mockReturnValue(issuedToken);
    dispatchEmailMock = jest.fn().mockResolvedValue(undefined);

    const repository = {
      findResettableUserByEmail: findResettableUserByEmailMock,
      replaceToken: replaceTokenMock,
    } as unknown as PasswordResetRepository;
    const tokenService = {
      issue: issueTokenMock,
    } as unknown as PasswordResetTokenService;
    const emailDispatcher = {
      dispatch: dispatchEmailMock,
    } as unknown as PasswordResetEmailDispatcher;

    service = new PasswordResetService(
      repository,
      tokenService,
      emailDispatcher,
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
});
