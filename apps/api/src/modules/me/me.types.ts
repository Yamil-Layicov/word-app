import type { UserRole, UserStatus } from '@prisma/client';

export type MeProfileModel = {
  id: string;
  displayName: string | null;
  countryCode: string | null;
  interfaceLanguage: string;
  activeLanguagePairId: string | null;
};

export type MeLanguageModel = {
  id: string;
  code: string;
  name: string;
  nativeName: string | null;
};

export type MeLanguagePairModel = {
  id: string;
  sourceLanguage: MeLanguageModel;
  targetLanguage: MeLanguageModel;
};

export type MeProfileResponseModel = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  profile: MeProfileModel | null;
  activeLanguagePair: MeLanguagePairModel | null;
  createdAt: Date;
};

export type MeProfileResponse = MeProfileResponseModel;
