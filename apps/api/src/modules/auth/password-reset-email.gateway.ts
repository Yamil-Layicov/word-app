export const PASSWORD_RESET_EMAIL_GATEWAY = Symbol(
  'PASSWORD_RESET_EMAIL_GATEWAY',
);

export type PasswordResetEmailMessage = {
  to: string;
  resetUrl: string;
  expiresAt: Date;
  idempotencyKey: string;
};

export type PasswordResetEmailReceipt = {
  providerMessageId: string;
};

export interface PasswordResetEmailGateway {
  send(message: PasswordResetEmailMessage): Promise<PasswordResetEmailReceipt>;
}
