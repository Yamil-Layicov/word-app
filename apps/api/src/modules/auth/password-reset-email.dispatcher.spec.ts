/// <reference types="jest" />

import { Logger } from '@nestjs/common';
import type { PasswordResetEmailGateway } from './password-reset-email.gateway';
import { PasswordResetEmailDispatcher } from './password-reset-email.dispatcher';
import { PasswordResetLinkService } from './password-reset-link.service';

const input = {
  to: 'user@example.com',
  rawToken: 'raw-token',
  tokenHash: 'token-hash',
  expiresAt: new Date('2026-07-29T08:30:00.000Z'),
};

describe('PasswordResetEmailDispatcher', () => {
  let createLinkMock: jest.Mock;
  let sendMock: jest.Mock;
  let loggerErrorSpy: jest.SpyInstance;
  let dispatcher: PasswordResetEmailDispatcher;

  beforeEach(() => {
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    createLinkMock = jest
      .fn()
      .mockReturnValue('mobile://reset-password?token=raw-token');
    sendMock = jest.fn().mockResolvedValue({
      providerMessageId: 'email-1',
    });

    const linkService = {
      create: createLinkMock,
    } as unknown as PasswordResetLinkService;
    const emailGateway = {
      send: sendMock,
    } as PasswordResetEmailGateway;

    dispatcher = new PasswordResetEmailDispatcher(linkService, emailGateway);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('builds a trusted link and sends an idempotent email', async () => {
    await expect(dispatcher.dispatch(input)).resolves.toBeUndefined();

    expect(createLinkMock).toHaveBeenCalledWith(input.rawToken);
    expect(sendMock).toHaveBeenCalledWith({
      to: input.to,
      resetUrl: 'mobile://reset-password?token=raw-token',
      expiresAt: input.expiresAt,
      idempotencyKey: 'password-reset-token-hash',
    });
  });

  it('contains provider failures so the public response is unaffected', async () => {
    sendMock.mockRejectedValue(new Error('Provider unavailable'));

    await expect(dispatcher.dispatch(input)).resolves.toBeUndefined();
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Password reset email delivery failed: Provider unavailable',
    );
  });
});
