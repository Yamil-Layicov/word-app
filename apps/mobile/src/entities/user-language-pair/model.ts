export type UserLanguagePairLanguage = {
  id: string;
  code: string;
  name: string;
  nativeName: string;
};

export type UserLanguagePairDetails = {
  id: string;
  sourceLanguage: UserLanguagePairLanguage;
  targetLanguage: UserLanguagePairLanguage;
};

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type UserLanguagePair = {
  id: string;
  languagePairId: string;
  languagePair: UserLanguagePairDetails;
  isLearning: boolean;
  targetCefrLevel: CefrLevel | null;
  isActive: boolean;
  createdAt: string;
};

export type AddMeLanguagePairRequest = {
  languagePairId: string;
  targetCefrLevel?: CefrLevel;
};
