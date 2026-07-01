import { authClient } from "@/auth";

import type {
  AnswerPracticeRequest,
  AnswerPracticeResponse,
  PracticeItemsFilters,
  PracticeItemsResponse,
} from "./model";

export function listPracticeItems(filters: PracticeItemsFilters = {}) {
  return authClient.get<PracticeItemsResponse>("/practice/items", {
    query: filters,
  });
}

export function answerPractice(input: AnswerPracticeRequest) {
  return authClient.post<AnswerPracticeResponse>("/practice/answer", input);
}
