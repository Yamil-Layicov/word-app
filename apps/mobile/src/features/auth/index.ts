export {
  getCurrentUser,
  login,
  logoutSession,
  refreshSession,
  register,
  requestPasswordReset,
  resetPassword,
} from "./api";
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
export { useLogout } from "./hooks/useLogout";
export { useRegister } from "./hooks/useRegister";
export { useRequestPasswordReset } from "./hooks/useRequestPasswordReset";
export { useResetPassword } from "./hooks/useResetPassword";
export { useStartSession } from "./hooks/useStartSession";
export { useAuthFailureRedirect } from "./hooks/useAuthFailureRedirect";
export { useCurrentUserQuery } from "./queries";
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
export type {
  AuthTokensResponse,
  AuthUser,
  AuthUserProfile,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
  ResetPasswordRequest,
  ResetPasswordResponse,
  UserRole,
  UserStatus,
} from "./model";
