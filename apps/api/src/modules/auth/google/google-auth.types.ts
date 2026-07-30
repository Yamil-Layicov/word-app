import type { AuthProvider } from '@prisma/client';
import type { AuthLoginResponse } from '../auth.types';

export const GOOGLE_AUTH_STATUS = {
  authenticated: 'AUTHENTICATED',
  onboardingRequired: 'ONBOARDING_REQUIRED',
} as const;

export type GoogleAuthOnboardingResponse = {
  status: typeof GOOGLE_AUTH_STATUS.onboardingRequired;
  profile: {
    email: string;
    displayName?: string;
    pictureUrl?: string;
  };
};

export type GoogleAuthAuthenticatedResponse = AuthLoginResponse & {
  status: typeof GOOGLE_AUTH_STATUS.authenticated;
};

export type GoogleAuthResponse =
  | GoogleAuthOnboardingResponse
  | GoogleAuthAuthenticatedResponse;

export type LinkedAuthIdentityResponse = {
  provider: AuthProvider;
  email: string | null;
  linkedAt: Date;
};
