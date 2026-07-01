import { useCallback } from "react";

import { setAccessToken } from "@/auth";
import { queryClient } from "@/shared/lib/query-client";
import type { AuthTokensResponse } from "../model";
import { authQueryKeys } from "../query-keys";

export function useStartSession() {
  return useCallback((response: AuthTokensResponse) => {
    setAccessToken(response.accessToken);
    queryClient.setQueryData(authQueryKeys.me(), response.user);
  }, []);
}
