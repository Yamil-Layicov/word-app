import { authClient } from "@/auth";
import type {
  AddDeckWordsRequest,
  CreateDeckRequest,
  DeckDetail,
  DecksResponse,
} from "./model";

export function listDecks() {
  return authClient.get<DecksResponse>("/decks");
}

export function getDeck(id: string) {
  return authClient.get<DeckDetail>(`/decks/${id}`);
}

export function createDeck(input: CreateDeckRequest) {
  return authClient.post<DeckDetail>("/decks", input);
}

export function addDeckWords(deckId: string, input: AddDeckWordsRequest) {
  return authClient.post<DeckDetail>(`/decks/${deckId}/words`, input);
}

export function removeDeckWord(deckId: string, deckCardId: string) {
  return authClient.delete<void>(`/decks/${deckId}/words/${deckCardId}`);
}
