import { baseClient } from "@/shared/api/base-client";
import { authClient } from "@/auth";
import type {
  AuthTokensResponse,
  AuthUser,
  ConfirmEmailVerificationRequest,
  ConfirmEmailVerificationResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
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
} from "./model";

export function register(input: RegisterRequest) {
  return baseClient.post<RegisterResponse>("/auth/register", input);
}

export function login(input: LoginRequest) {
  return baseClient.post<AuthTokensResponse>("/auth/login", input);
}

export function authenticateWithGoogle(input: GoogleAuthRequest) {
  return baseClient.post<GoogleAuthResponse>("/auth/google", input);
}

export function getLinkedAuthIdentities() {
  return authClient.get<LinkedAuthIdentity[]>("/auth/identities");
}

export function linkGoogleAccount(input: LinkGoogleAccountRequest) {
  return authClient.post<LinkedAuthIdentity>("/auth/google/link", input);
}

export function requestPasswordReset(input: ForgotPasswordRequest) {
  return baseClient.post<ForgotPasswordResponse>(
    "/auth/forgot-password",
    input,
  );
}

export function resetPassword(input: ResetPasswordRequest) {
  return baseClient.post<ResetPasswordResponse>("/auth/reset-password", input);
}

export function requestEmailVerification(
  input: RequestEmailVerificationRequest,
) {
  return baseClient.post<RequestEmailVerificationResponse>(
    "/auth/email-verification/request",
    input,
  );
}

export function confirmEmailVerification(
  input: ConfirmEmailVerificationRequest,
) {
  return baseClient.post<ConfirmEmailVerificationResponse>(
    "/auth/email-verification/confirm",
    input,
  );
}

export function refreshSession(input: RefreshTokenRequest) {
  return baseClient.post<AuthTokensResponse>("/auth/refresh", input);
}

export function logoutSession(input: RefreshTokenRequest) {
  return baseClient.post<void>("/auth/logout", input);
}

export function getCurrentUser() {
  return authClient.get<AuthUser>("/auth/me");
}
