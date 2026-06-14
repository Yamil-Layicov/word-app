import type {
  MeLanguageModel,
  MeLanguagePairModel,
  MeLanguagePairsModel,
  MeLanguagePairsResponse,
  MeProfileResponse,
  MeProfileResponseModel,
} from './me.types';

function toMeLanguageResponse(language: MeLanguageModel): MeLanguageModel {
  return {
    id: language.id,
    code: language.code,
    name: language.name,
    nativeName: language.nativeName,
  };
}

function toMeLanguagePairResponse(
  languagePair: MeLanguagePairModel,
): MeLanguagePairModel {
  return {
    id: languagePair.id,
    sourceLanguage: toMeLanguageResponse(languagePair.sourceLanguage),
    targetLanguage: toMeLanguageResponse(languagePair.targetLanguage),
  };
}

export function toMeProfileResponse(
  user: MeProfileResponseModel,
): MeProfileResponse {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    profile: user.profile
      ? {
          id: user.profile.id,
          displayName: user.profile.displayName,
          countryCode: user.profile.countryCode,
          interfaceLanguage: user.profile.interfaceLanguage,
          activeLanguagePairId: user.profile.activeLanguagePairId,
        }
      : null,
    activeLanguagePair: user.activeLanguagePair
      ? toMeLanguagePairResponse(user.activeLanguagePair)
      : null,
    createdAt: user.createdAt,
  };
}

export function toMeLanguagePairsResponse(
  input: MeLanguagePairsModel,
): MeLanguagePairsResponse {
  return input.languagePairs.map((userLanguagePair) => ({
    id: userLanguagePair.id,
    languagePairId: userLanguagePair.languagePairId,
    languagePair: toMeLanguagePairResponse(userLanguagePair.languagePair),
    isLearning: userLanguagePair.isLearning,
    targetCefrLevel: userLanguagePair.targetCefrLevel,
    isActive: userLanguagePair.languagePairId === input.activeLanguagePairId,
    createdAt: userLanguagePair.createdAt,
  }));
}
