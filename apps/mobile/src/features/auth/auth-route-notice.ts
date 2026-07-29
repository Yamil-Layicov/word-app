export const AUTH_ROUTE_NOTICE = {
  accountCreated: "account-created",
  emailVerified: "email-verified",
  passwordReset: "password-reset",
} as const;

export function getAuthRouteNoticeMessage(
  value: string | string[] | undefined,
): string | null {
  const notice = Array.isArray(value) ? value[0] : value;

  switch (notice) {
    case AUTH_ROUTE_NOTICE.accountCreated:
      return "Your account was created. Log in to continue.";
    case AUTH_ROUTE_NOTICE.emailVerified:
      return "Your email was verified. Log in to continue.";
    case AUTH_ROUTE_NOTICE.passwordReset:
      return "Your password was reset. Log in with your new password.";
    default:
      return null;
  }
}
