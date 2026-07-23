import { useCallback } from "react";

import { setAccessToken } from "@/auth";
import { syncCurrentDevicePushToken } from "@/features/push-notifications";
import { queryClient } from "@/shared/lib/query-client";
import type { AuthTokensResponse } from "../model";
import { authQueryKeys } from "../query-keys";

export function useStartSession() {
  return useCallback((response: AuthTokensResponse) => {
    setAccessToken(response.accessToken);
    queryClient.setQueryData(authQueryKeys.me(), response.user);

    void syncCurrentDevicePushToken().catch((error: unknown) => {
      if (__DEV__) {
        console.warn("Push token synchronization failed", error);
      }
    });
  }, []);
}
