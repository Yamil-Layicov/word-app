import { useQuery } from "@tanstack/react-query";

import { getMeProfile } from "./api";
import { userQueryKeys } from "./query-keys";

export function useMeProfileQuery() {
  return useQuery({
    queryKey: userQueryKeys.profile(),
    queryFn: getMeProfile,
  });
}
