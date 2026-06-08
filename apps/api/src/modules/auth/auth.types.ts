import type { UserRole, UserStatus } from '@prisma/client';

export type AuthUserProfileModel = {
  id: string;
  displayName: string | null;
  countryCode: string | null;
  interfaceLanguage: string;
  activeLanguagePairId: string | null;
};

export type AuthUserResponseModel = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  profile: AuthUserProfileModel | null;
  createdAt: Date;
};

export type AuthUserForLogin = AuthUserResponseModel & {
  passwordHash: string;
};

export type AuthUserResponse = AuthUserResponseModel;

export type AuthLoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponse;
};

export type AuthSessionForRefresh = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: AuthUserResponseModel;
};

export type CreatedAuthSession = {
  id: string;
  userId: string;
  expiresAt: Date;
};

export type AuthRequestContext = {
  userAgent?: string;
  ipAddress?: string;
};
