import type {
  AuthLoginResponse,
  AuthUserResponse,
  AuthUserResponseModel,
} from './auth.types';

export function toAuthUserResponse(
  user: AuthUserResponseModel,
): AuthUserResponse {
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
    createdAt: user.createdAt,
  };
}

export function toAuthLoginResponse(input: {
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponseModel;
}): AuthLoginResponse {
  return {
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    user: toAuthUserResponse(input.user),
  };
}
