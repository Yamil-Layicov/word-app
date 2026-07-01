import { baseClient } from "@/shared/api/base-client";
import { authClient } from "@/auth";
import type { AuthTokensResponse, AuthUser, LoginRequest, RegisterRequest } from "./model";

export function register(input: RegisterRequest) {
  return baseClient.post<AuthTokensResponse>("/auth/register", input);
}

export function login(input: LoginRequest) {
  return baseClient.post<AuthTokensResponse>("/auth/login", input);
}

export function getCurrentUser() {
  return authClient.get<AuthUser>("/auth/me");
}
