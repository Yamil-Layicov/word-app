export const masteredCollectionQueryKeys = {
  all: ["mastered-collections"] as const,
  lists: () => [...masteredCollectionQueryKeys.all, "list"] as const,
  list: () => [...masteredCollectionQueryKeys.lists()] as const,
  details: () => [...masteredCollectionQueryKeys.all, "detail"] as const,
  detail: (id: string) =>
    [...masteredCollectionQueryKeys.details(), id] as const,
};
