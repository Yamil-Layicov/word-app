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

export type RegisterRequest = {
  email: string;
  password: string;
  displayName?: string;
  countryCode?: string;
  languagePairId: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};
