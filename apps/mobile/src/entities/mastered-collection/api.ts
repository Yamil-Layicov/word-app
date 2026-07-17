import { authClient } from "@/auth";
import type {
  AddMasteredCollectionWordsRequest,
  CreateMasteredCollectionRequest,
  MasteredCollectionDetail,
  MasteredCollectionsResponse,
} from "./model";

export function listMasteredCollections() {
  return authClient.get<MasteredCollectionsResponse>("/mastered-collections");
}

export function getMasteredCollection(id: string) {
  return authClient.get<MasteredCollectionDetail>(
    `/mastered-collections/${id}`,
  );
}

export function createMasteredCollection(
  input: CreateMasteredCollectionRequest,
) {
  return authClient.post<MasteredCollectionDetail>(
    "/mastered-collections",
    input,
  );
}

export function addMasteredCollectionWords(
  collectionId: string,
  input: AddMasteredCollectionWordsRequest,
) {
  return authClient.post<MasteredCollectionDetail>(
    `/mastered-collections/${collectionId}/words`,
    input,
  );
}

export function removeMasteredCollectionWord(
  collectionId: string,
  collectionWordId: string,
) {
  return authClient.delete<void>(
    `/mastered-collections/${collectionId}/words/${collectionWordId}`,
  );
}

export function deleteMasteredCollection(collectionId: string) {
  return authClient.delete<void>(`/mastered-collections/${collectionId}`);
}
