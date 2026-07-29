export const AUTH_ROUTE_NOTICE = {
  accountCreated: "account-created",
} as const;

export function getAuthRouteNoticeMessage(
  value: string | string[] | undefined,
): string | null {
  const notice = Array.isArray(value) ? value[0] : value;

  switch (notice) {
    case AUTH_ROUTE_NOTICE.accountCreated:
      return "Your account was created. Log in to continue.";
    default:
      return null;
  }
}
