export const deckQueryKeys = {
  all: ["decks"] as const,
  lists: () => [...deckQueryKeys.all, "list"] as const,
  list: () => [...deckQueryKeys.lists()] as const,
  details: () => [...deckQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...deckQueryKeys.details(), id] as const,
};
