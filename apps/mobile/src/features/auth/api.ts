import { baseClient } from "@/shared/api/base-client";
import { authClient } from "@/auth";
import type {
  AuthTokensResponse,
  AuthUser,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
} from "./model";

export function register(input: RegisterRequest) {
  return baseClient.post<AuthTokensResponse>("/auth/register", input);
}

export function login(input: LoginRequest) {
  return baseClient.post<AuthTokensResponse>("/auth/login", input);
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
