export type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";
export type UserStatus = "ACTIVE" | "BLOCKED" | "DELETED";

export type AuthUserProfile = {
  id: string;
  displayName: string | null;
  countryCode: string | null;
  interfaceLanguage: string;
  activeLanguagePairId: string | null;
};

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  profile: AuthUserProfile | null;
  createdAt: string;
};

export type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type RefreshTokenRequest = {
  refreshToken: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  displayName?: string;
  countryCode?: string;
  languagePairId: string;
};

export type RegisterResponse = AuthUser;

export type LoginRequest = {
  email: string;
  password: string;
};

export const GOOGLE_AUTH_STATUS = {
  authenticated: "AUTHENTICATED",
  onboardingRequired: "ONBOARDING_REQUIRED",
} as const;

export type GoogleAuthProfile = {
  email: string;
  displayName?: string;
  pictureUrl?: string;
};

export type GoogleAuthRequest = {
  idToken: string;
  languagePairId?: string;
};

export type GoogleAuthOnboardingResponse = {
  status: typeof GOOGLE_AUTH_STATUS.onboardingRequired;
  profile: GoogleAuthProfile;
};

export type GoogleAuthAuthenticatedResponse = AuthTokensResponse & {
  status: typeof GOOGLE_AUTH_STATUS.authenticated;
};

export type GoogleAuthResponse =
  | GoogleAuthOnboardingResponse
  | GoogleAuthAuthenticatedResponse;

export function isGoogleAuthAuthenticated(
  response: GoogleAuthResponse,
): response is GoogleAuthAuthenticatedResponse {
  return response.status === GOOGLE_AUTH_STATUS.authenticated;
}

export type ForgotPasswordRequest = {
  email: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export type ResetPasswordRequest = {
  token: string;
  newPassword: string;
};

export type ResetPasswordResponse = {
  message: string;
};

export type RequestEmailVerificationRequest = {
  email: string;
};

export type RequestEmailVerificationResponse = {
  message: string;
};

export type ConfirmEmailVerificationRequest = {
  token: string;
};

export type ConfirmEmailVerificationResponse = {
  message: string;
};
