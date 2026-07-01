import { useCallback } from "react";

import { clearAccessToken } from "@/auth";
import { queryClient } from "@/shared/lib/query-client";

export function useLogout() {
  return useCallback(() => {
    clearAccessToken();
    queryClient.clear();
  }, []);
}
