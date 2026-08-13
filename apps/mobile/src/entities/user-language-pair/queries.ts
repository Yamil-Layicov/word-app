import { useQuery } from "@tanstack/react-query";

import { listMeLanguagePairs } from "./api";
import { userLanguagePairQueryKeys } from "./query-keys";

export function useMeLanguagePairsQuery(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: userLanguagePairQueryKeys.list(),
    queryFn: listMeLanguagePairs,
    enabled: options.enabled,
  });
}
