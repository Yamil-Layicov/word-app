export const EMAIL_VERIFICATION_EMAIL_GATEWAY = Symbol(
  'EMAIL_VERIFICATION_EMAIL_GATEWAY',
);

export type EmailVerificationEmailMessage = {
  to: string;
  verificationUrl: string;
  expiresAt: Date;
  idempotencyKey: string;
};

export type EmailVerificationEmailReceipt = {
  providerMessageId: string;
};

export interface EmailVerificationEmailGateway {
  send(
    message: EmailVerificationEmailMessage,
  ): Promise<EmailVerificationEmailReceipt>;
}
