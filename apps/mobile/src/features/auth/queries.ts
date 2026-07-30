import { useQuery } from "@tanstack/react-query";

import { getCurrentUser, getLinkedAuthIdentities } from "./api";
import { authQueryKeys } from "./query-keys";

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: authQueryKeys.me(),
    queryFn: getCurrentUser,
  });
}

export function useAuthIdentitiesQuery() {
  return useQuery({
    queryKey: authQueryKeys.identities(),
    queryFn: getLinkedAuthIdentities,
  });
}
