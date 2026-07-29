/// <reference types="jest" />

import { Logger } from '@nestjs/common';
import type { EmailVerificationEmailGateway } from './email-verification-email.gateway';
import { EmailVerificationEmailDispatcher } from './email-verification-email.dispatcher';
import { EmailVerificationLinkService } from './email-verification-link.service';

const input = {
  to: 'user@example.com',
  rawToken: 'a'.repeat(43),
  tokenHash: 'token-hash',
  expiresAt: new Date('2026-07-30T08:00:00.000Z'),
};

describe('EmailVerificationEmailDispatcher', () => {
  let createLinkMock: jest.Mock;
  let sendMock: jest.Mock;
  let loggerErrorSpy: jest.SpyInstance;
  let dispatcher: EmailVerificationEmailDispatcher;

  beforeEach(() => {
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    createLinkMock = jest
      .fn()
      .mockReturnValue(`mobile://verify-email?token=${input.rawToken}`);
    sendMock = jest.fn().mockResolvedValue({
      providerMessageId: 'email-1',
    });

    const linkService = {
      create: createLinkMock,
    } as unknown as EmailVerificationLinkService;
    const emailGateway = {
      send: sendMock,
    } as EmailVerificationEmailGateway;

    dispatcher = new EmailVerificationEmailDispatcher(
      linkService,
      emailGateway,
    );
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('builds a trusted link and sends an idempotent email', async () => {
    await expect(dispatcher.dispatch(input)).resolves.toBeUndefined();

    expect(createLinkMock).toHaveBeenCalledWith(input.rawToken);
    expect(sendMock).toHaveBeenCalledWith({
      to: input.to,
      verificationUrl: `mobile://verify-email?token=${input.rawToken}`,
      expiresAt: input.expiresAt,
      idempotencyKey: 'email-verification-token-hash',
    });
  });

  it('contains provider failures so the public response is unaffected', async () => {
    sendMock.mockRejectedValue(new Error('Provider unavailable'));

    await expect(dispatcher.dispatch(input)).resolves.toBeUndefined();
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Email verification delivery failed: Provider unavailable',
    );
  });
});
