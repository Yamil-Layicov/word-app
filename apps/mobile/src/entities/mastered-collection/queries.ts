import { useQuery } from "@tanstack/react-query";

import { getMasteredCollection, listMasteredCollections } from "./api";
import { masteredCollectionQueryKeys } from "./query-keys";

export function useMasteredCollectionsQuery() {
  return useQuery({
    queryKey: masteredCollectionQueryKeys.list(),
    queryFn: listMasteredCollections,
  });
}

export function useMasteredCollectionQuery(id: string) {
  return useQuery({
    queryKey: masteredCollectionQueryKeys.detail(id),
    queryFn: () => getMasteredCollection(id),
    enabled: id.length > 0,
  });
}
