export { getCurrentUser, login, logoutSession, refreshSession, register } from "./api";
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
  validateLoginForm,
  validateRegisterForm,
  type LoginFormErrors,
  type LoginFormValues,
  type RegisterFormErrors,
  type RegisterFormValues,
} from "./form-validation";
export { useLogin } from "./hooks/useLogin";
export { useLogout } from "./hooks/useLogout";
export { useRegister } from "./hooks/useRegister";
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
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
  UserRole,
  UserStatus,
} from "./model";
