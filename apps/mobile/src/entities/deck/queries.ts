import { useQuery } from "@tanstack/react-query";

import { getDeck, listDecks } from "./api";
import { deckQueryKeys } from "./query-keys";

export function useDecksQuery() {
  return useQuery({
    queryKey: deckQueryKeys.list(),
    queryFn: listDecks,
  });
}

export function useDeckQuery(id: string) {
  return useQuery({
    queryKey: deckQueryKeys.detail(id),
    queryFn: () => getDeck(id),
    enabled: id.length > 0,
  });
}
