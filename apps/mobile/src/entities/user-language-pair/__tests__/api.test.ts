/// <reference types="jest" />

import { authClient } from "@/auth";
import { addMeLanguagePair, listMeLanguagePairs } from "../api";
import type { AddMeLanguagePairRequest } from "../model";

jest.mock("@/auth", () => ({
  authClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const getMock = authClient.get as jest.Mock;
const postMock = authClient.post as jest.Mock;

describe("user language-pair API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists the current user's language pairs", async () => {
    const response = [{ id: "user-language-pair-1" }];
    getMock.mockResolvedValue(response);

    await expect(listMeLanguagePairs()).resolves.toBe(response);

    expect(getMock).toHaveBeenCalledWith("/me/language-pairs");
  });

  it("adds a language pair and forwards the optional CEFR level", async () => {
    const input: AddMeLanguagePairRequest = {
      languagePairId: "language-pair-2",
      targetCefrLevel: "B1",
    };
    const response = [{ id: "user-language-pair-2" }];
    postMock.mockResolvedValue(response);

    await expect(addMeLanguagePair(input)).resolves.toBe(response);

    expect(postMock).toHaveBeenCalledWith("/me/language-pairs", input);
  });
});
