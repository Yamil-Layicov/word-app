/// <reference types="jest" />

import { ClockService } from '../../common/time/clock.service';
import { EmailVerificationEmailDispatcher } from './email-verification-email.dispatcher';
import { EmailVerificationRepository } from './email-verification.repository';
import {
  EMAIL_VERIFICATION_REQUEST_MESSAGE,
  EMAIL_VERIFICATION_SUCCESS_MESSAGE,
  INVALID_EMAIL_VERIFICATION_TOKEN_MESSAGE,
  EmailVerificationService,
} from './email-verification.service';
import { EmailVerificationTokenService } from './email-verification-token.service';

const issuedToken = {
  rawToken: 'a'.repeat(43),
  tokenHash: 'hashed-verification-token',
  expiresAt: new Date('2026-07-30T08:00:00.000Z'),
};
const now = new Date('2026-07-29T08:00:00.000Z');

describe('EmailVerificationService', () => {
  let findUnverifiedUserByEmailMock: jest.Mock;
  let replaceTokenMock: jest.Mock;
  let consumeTokenAndVerifyEmailMock: jest.Mock;
  let issueTokenMock: jest.Mock;
  let hashTokenMock: jest.Mock;
  let dispatchEmailMock: jest.Mock;
  let service: EmailVerificationService;

  beforeEach(() => {
    findUnverifiedUserByEmailMock = jest.fn();
    replaceTokenMock = jest.fn();
    consumeTokenAndVerifyEmailMock = jest.fn();
    issueTokenMock = jest.fn().mockReturnValue(issuedToken);
    hashTokenMock = jest.fn().mockReturnValue('hashed-input-token');
    dispatchEmailMock = jest.fn().mockResolvedValue(undefined);

    const repository = {
      findUnverifiedUserByEmail: findUnverifiedUserByEmailMock,
      replaceToken: replaceTokenMock,
      consumeTokenAndVerifyEmail: consumeTokenAndVerifyEmailMock,
    } as unknown as EmailVerificationRepository;
    const tokenService = {
      issue: issueTokenMock,
      hash: hashTokenMock,
    } as unknown as EmailVerificationTokenService;
    const emailDispatcher = {
      dispatch: dispatchEmailMock,
    } as unknown as EmailVerificationEmailDispatcher;
    const clockService = {
      now: jest.fn().mockReturnValue(now),
    } as unknown as ClockService;

    service = new EmailVerificationService(
      repository,
      tokenService,
      emailDispatcher,
      clockService,
    );
  });

  it('delegates token issuance for atomic registration persistence', () => {
    expect(service.issue()).toBe(issuedToken);
    expect(issueTokenMock).toHaveBeenCalledTimes(1);
  });

  it('replaces the current token for an existing unverified account', async () => {
    findUnverifiedUserByEmailMock.mockResolvedValue({
      id: 'user-1',
    });

    await expect(service.request('  User@Example.COM ')).resolves.toEqual({
      message: EMAIL_VERIFICATION_REQUEST_MESSAGE,
    });
    expect(findUnverifiedUserByEmailMock).toHaveBeenCalledWith(
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
    findUnverifiedUserByEmailMock.mockResolvedValue(null);

    await expect(service.request('missing@example.com')).resolves.toEqual({
      message: EMAIL_VERIFICATION_REQUEST_MESSAGE,
    });
    expect(replaceTokenMock).not.toHaveBeenCalled();
    expect(dispatchEmailMock).not.toHaveBeenCalled();
  });

  it('consumes a valid token and verifies the account', async () => {
    consumeTokenAndVerifyEmailMock.mockResolvedValue(true);

    await expect(service.confirm('raw-input-token')).resolves.toEqual({
      message: EMAIL_VERIFICATION_SUCCESS_MESSAGE,
    });
    expect(hashTokenMock).toHaveBeenCalledWith('raw-input-token');
    expect(consumeTokenAndVerifyEmailMock).toHaveBeenCalledWith({
      tokenHash: 'hashed-input-token',
      now,
    });
  });

  it('rejects an invalid, expired, or consumed token with one safe message', async () => {
    consumeTokenAndVerifyEmailMock.mockResolvedValue(false);

    await expect(service.confirm('raw-input-token')).rejects.toMatchObject({
      message: INVALID_EMAIL_VERIFICATION_TOKEN_MESSAGE,
    });
  });
});
