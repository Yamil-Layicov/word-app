import { useMutation } from "@tanstack/react-query";

import {
  addDeckWords,
  createDeck,
  deckQueryKeys,
  removeDeckWord,
  type AddDeckWordsRequest,
  type CreateDeckRequest,
} from "@/entities/deck";
import { vocabularyItemQueryKeys } from "@/entities/vocabulary-item";
import { scheduledReviewQueryKeys } from "@/features/review-boxes";
import { queryClient } from "@/shared/lib/query-client";

export function useCreateDeck() {
  return useMutation({
    mutationFn: (input: CreateDeckRequest) => createDeck(input),
    onSuccess: (deck) => {
      queryClient.setQueryData(deckQueryKeys.detail(deck.id), deck);
      void queryClient.invalidateQueries({ queryKey: deckQueryKeys.lists() });
    },
  });
}

export function useAddDeckWords(deckId: string) {
  return useMutation({
    mutationFn: (input: AddDeckWordsRequest) => addDeckWords(deckId, input),
    onSuccess: (deck) => {
      queryClient.setQueryData(deckQueryKeys.detail(deck.id), deck);
      void queryClient.invalidateQueries({ queryKey: deckQueryKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: vocabularyItemQueryKeys.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: scheduledReviewQueryKeys.all,
      });
    },
  });
}

export function useRemoveDeckWord(deckId: string) {
  return useMutation({
    mutationFn: (deckCardId: string) => removeDeckWord(deckId, deckCardId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: deckQueryKeys.detail(deckId),
      });
      void queryClient.invalidateQueries({ queryKey: deckQueryKeys.lists() });
    },
  });
}
