/// <reference types="jest" />

import { renderHook } from "@testing-library/react-native";

import {
  archiveVocabularyItem,
  vocabularyItemQueryKeys,
} from "@/entities/vocabulary-item";
import { queryClient } from "@/shared/lib/query-client";
import { useArchiveVocabularyItem } from "../hooks/useArchiveVocabularyItem";

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn((options: unknown) => options),
}));

jest.mock("@/entities/vocabulary-item", () => ({
  ...jest.requireActual("@/entities/vocabulary-item"),
  archiveVocabularyItem: jest.fn(),
}));

jest.mock("@/shared/lib/query-client", () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
    removeQueries: jest.fn(),
  },
}));

const archiveVocabularyItemMock = jest.mocked(archiveVocabularyItem);
const invalidateQueriesMock = jest.mocked(queryClient.invalidateQueries);
const removeQueriesMock = jest.mocked(queryClient.removeQueries);

type ArchiveMutationOptions = {
  mutationFn: (id: string) => Promise<void>;
  onSuccess: (response: void, id: string) => void;
};

describe("useArchiveVocabularyItem", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("removes stale detail data and refreshes lists after a 204 response", async () => {
    archiveVocabularyItemMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useArchiveVocabularyItem());
    const mutation = result.current as unknown as ArchiveMutationOptions;

    await expect(mutation.mutationFn("item-1")).resolves.toBeUndefined();
    mutation.onSuccess(undefined, "item-1");

    expect(archiveVocabularyItemMock).toHaveBeenCalledWith("item-1");
    expect(removeQueriesMock).toHaveBeenCalledWith({
      queryKey: vocabularyItemQueryKeys.detail("item-1"),
      exact: true,
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: vocabularyItemQueryKeys.lists(),
    });
  });
});
