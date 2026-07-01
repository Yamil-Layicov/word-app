import { useQuery } from "@tanstack/react-query";

import { getCurrentUser } from "./api";
import { authQueryKeys } from "./query-keys";

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: authQueryKeys.me(),
    queryFn: getCurrentUser,
  });
}
