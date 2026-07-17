import { useMutation } from "@tanstack/react-query";

import {
  addMasteredCollectionWords,
  createMasteredCollection,
  deleteMasteredCollection,
  masteredCollectionQueryKeys,
  removeMasteredCollectionWord,
  type AddMasteredCollectionWordsRequest,
  type CreateMasteredCollectionRequest,
} from "@/entities/mastered-collection";
import { queryClient } from "@/shared/lib/query-client";

type AddWordsInput = {
  collectionId: string;
  input: AddMasteredCollectionWordsRequest;
};

type RemoveWordInput = {
  collectionId: string;
  collectionWordId: string;
};

export function useCreateMasteredCollection() {
  return useMutation({
    mutationFn: (input: CreateMasteredCollectionRequest) =>
      createMasteredCollection(input),
    onSuccess: (collection) => {
      queryClient.setQueryData(
        masteredCollectionQueryKeys.detail(collection.id),
        collection,
      );
      void queryClient.invalidateQueries({
        queryKey: masteredCollectionQueryKeys.lists(),
      });
    },
  });
}

export function useAddMasteredCollectionWords() {
  return useMutation({
    mutationFn: ({ collectionId, input }: AddWordsInput) =>
      addMasteredCollectionWords(collectionId, input),
    onSuccess: (collection) => {
      queryClient.setQueryData(
        masteredCollectionQueryKeys.detail(collection.id),
        collection,
      );
      void queryClient.invalidateQueries({
        queryKey: masteredCollectionQueryKeys.lists(),
      });
    },
  });
}

export function useRemoveMasteredCollectionWord() {
  return useMutation({
    mutationFn: ({ collectionId, collectionWordId }: RemoveWordInput) =>
      removeMasteredCollectionWord(collectionId, collectionWordId),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({
        queryKey: masteredCollectionQueryKeys.detail(input.collectionId),
      });
      void queryClient.invalidateQueries({
        queryKey: masteredCollectionQueryKeys.lists(),
      });
    },
  });
}

export function useDeleteMasteredCollection() {
  return useMutation({
    mutationFn: (collectionId: string) =>
      deleteMasteredCollection(collectionId),
    onSuccess: (_data, collectionId) => {
      queryClient.removeQueries({
        queryKey: masteredCollectionQueryKeys.detail(collectionId),
      });
      void queryClient.invalidateQueries({
        queryKey: masteredCollectionQueryKeys.lists(),
      });
    },
  });
}
