import { baseClient } from "@/shared/api/base-client";
import type { AuthTokensResponse, LoginRequest, RegisterRequest } from "./model";

export function register(input: RegisterRequest) {
  return baseClient.post<AuthTokensResponse>("/auth/register", input);
}

export function login(input: LoginRequest) {
  return baseClient.post<AuthTokensResponse>("/auth/login", input);
}
