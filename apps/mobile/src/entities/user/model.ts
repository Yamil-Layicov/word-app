export type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";
export type UserStatus = "ACTIVE" | "BLOCKED" | "DELETED";

export type UserProfile = {
  id: string;
  displayName: string | null;
  countryCode: string | null;
  interfaceLanguage: string;
  activeLanguagePairId: string | null;
};

export type UserLanguage = {
  id: string;
  code: string;
  name: string;
  nativeName: string;
};

export type UserActiveLanguagePair = {
  id: string;
  sourceLanguage: UserLanguage;
  targetLanguage: UserLanguage;
};

export type MeProfile = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  profile: UserProfile | null;
  activeLanguagePair: UserActiveLanguagePair | null;
  createdAt: string;
};

export type UpdateMeProfileRequest = {
  displayName?: string;
  countryCode?: string;
  interfaceLanguage?: string;
};

export type SetActiveLanguagePairRequest = {
  languagePairId: string;
};
