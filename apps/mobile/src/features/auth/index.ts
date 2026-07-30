export {
  authenticateWithGoogle,
  confirmEmailVerification,
  getCurrentUser,
  getLinkedAuthIdentities,
  linkGoogleAccount,
  login,
  logoutSession,
  refreshSession,
  register,
  requestEmailVerification,
  requestPasswordReset,
  resetPassword,
} from "./api";
export { AUTH_API_ERROR_CODE } from "./auth-api-error-code";
export {
  AUTH_ROUTE_NOTICE,
  getAuthRouteNoticeMessage,
} from "./auth-route-notice";
export {
  AuthSessionProvider,
  type AuthSessionStatus,
  useAuthSession,
} from "./AuthSessionProvider";
export { authQueryKeys } from "./query-keys";
export {
  validateForgotPasswordForm,
  validateLoginForm,
  validateRegisterForm,
  validateResetPasswordForm,
  isValidEmailVerificationToken,
  isValidPasswordResetToken,
  type ForgotPasswordFormErrors,
  type ForgotPasswordFormValues,
  type LoginFormErrors,
  type LoginFormValues,
  type RegisterFormErrors,
  type RegisterFormValues,
  type ResetPasswordFormErrors,
  type ResetPasswordFormValues,
} from "./form-validation";
export { useLogin } from "./hooks/useLogin";
export { useGoogleAuth } from "./hooks/useGoogleAuth";
export { useLinkGoogleAccount } from "./hooks/useLinkGoogleAccount";
export { useConfirmEmailVerification } from "./hooks/useConfirmEmailVerification";
export { useLogout } from "./hooks/useLogout";
export { useRegister } from "./hooks/useRegister";
export { useRequestPasswordReset } from "./hooks/useRequestPasswordReset";
export { useRequestEmailVerification } from "./hooks/useRequestEmailVerification";
export { useResetPassword } from "./hooks/useResetPassword";
export { useStartSession } from "./hooks/useStartSession";
export { useAuthFailureRedirect } from "./hooks/useAuthFailureRedirect";
export { useAuthIdentitiesQuery, useCurrentUserQuery } from "./queries";
export {
  buildRegisterRequest,
  clearRegisterDraft,
  getRegisterDraft,
  isCompleteRegisterDraft,
  saveRegisterLanguagePair,
  saveRegisterDraft,
  type CompleteRegisterDraft,
  type RegisterDraft,
} from "./register-draft";
export {
  clearGoogleAuthDraft,
  getGoogleAuthDraft,
  saveGoogleAuthDraft,
  type GoogleAuthDraft,
} from "./google-auth-draft";
export {
  isGoogleSignInSupported,
  requestGoogleIdToken,
} from "./google-sign-in/google-sign-in-client";
export {
  getGoogleSignInErrorMessage,
  GOOGLE_SIGN_IN_ERROR_CODE,
  GoogleSignInClientError,
  type GoogleIdTokenResult,
  type GoogleSignInErrorCode,
} from "./google-sign-in/google-sign-in.types";
export type {
  AuthTokensResponse,
  AuthUser,
  AuthUserProfile,
  AuthProvider,
  ConfirmEmailVerificationRequest,
  ConfirmEmailVerificationResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  GoogleAuthAuthenticatedResponse,
  GoogleAuthOnboardingResponse,
  GoogleAuthProfile,
  GoogleAuthRequest,
  GoogleAuthResponse,
  LinkedAuthIdentity,
  LinkGoogleAccountRequest,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
  RegisterResponse,
  RequestEmailVerificationRequest,
  RequestEmailVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  UserRole,
  UserStatus,
} from "./model";
export {
  GOOGLE_AUTH_STATUS,
  isGoogleAuthAuthenticated,
} from "./model";
