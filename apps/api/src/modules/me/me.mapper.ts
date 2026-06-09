import type { MeProfileResponse, MeProfileResponseModel } from './me.types';

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
    activeLanguagePair: user.activeLanguagePair,
    createdAt: user.createdAt,
  };
}
