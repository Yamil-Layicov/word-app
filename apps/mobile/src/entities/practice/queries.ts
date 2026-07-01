import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { listPracticeItems } from "./api";
import type { PracticeItemsFilters } from "./model";
import { practiceItemQueryKeys } from "./query-keys";

type InfinitePracticeItemsFilters = Omit<PracticeItemsFilters, "cursor">;

export function usePracticeItemsQuery(filters: PracticeItemsFilters = {}) {
  return useQuery({
    queryKey: practiceItemQueryKeys.list(filters),
    queryFn: () => listPracticeItems(filters),
  });
}

export function useInfinitePracticeItemsQuery(filters: InfinitePracticeItemsFilters = {}) {
  return useInfiniteQuery({
    queryKey: practiceItemQueryKeys.infiniteList(filters),
    queryFn: ({ pageParam }) =>
      listPracticeItems({
        ...filters,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
