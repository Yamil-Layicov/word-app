import { useQuery } from "@tanstack/react-query";

import { listMeLanguagePairs } from "./api";
import { userLanguagePairQueryKeys } from "./query-keys";

export function useMeLanguagePairsQuery() {
  return useQuery({
    queryKey: userLanguagePairQueryKeys.list(),
    queryFn: listMeLanguagePairs,
  });
}
