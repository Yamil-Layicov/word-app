import { useRouter } from "expo-router";
import { useEffect } from "react";

import { isApiError } from "@/shared/api/http-error";
import { useLogout } from "./useLogout";

export function useAuthFailureRedirect(error: unknown) {
  const logout = useLogout();
  const router = useRouter();
  const isUnauthorized = isApiError(error) && error.status === 401;

  useEffect(() => {
    if (isUnauthorized) {
      logout();
      router.replace("/login");
    }
  }, [isUnauthorized, logout, router]);

  return isUnauthorized;
}
