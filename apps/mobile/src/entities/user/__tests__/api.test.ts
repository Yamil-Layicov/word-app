/// <reference types="jest" />

import { authClient } from "@/auth";
import {
  getMeProfile,
  setActiveLanguagePair,
  updateMeProfile,
} from "../api";
import type {
  SetActiveLanguagePairRequest,
  UpdateMeProfileRequest,
} from "../model";

jest.mock("@/auth", () => ({
  authClient: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

const getMock = authClient.get as jest.Mock;
const patchMock = authClient.patch as jest.Mock;

describe("user API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gets the current profile through the authenticated API client", async () => {
    const response = { id: "user-1" };
    getMock.mockResolvedValue(response);

    await expect(getMeProfile()).resolves.toBe(response);

    expect(getMock).toHaveBeenCalledWith("/me/profile");
  });

  it("updates the current profile with the provided fields", async () => {
    const input: UpdateMeProfileRequest = {
      displayName: "Learner",
      countryCode: "AZ",
      interfaceLanguage: "az",
    };
    const response = { id: "user-1" };
    patchMock.mockResolvedValue(response);

    await expect(updateMeProfile(input)).resolves.toBe(response);

    expect(patchMock).toHaveBeenCalledWith("/me/profile", input);
  });

  it("sets the active language pair with the provided id", async () => {
    const input: SetActiveLanguagePairRequest = {
      languagePairId: "language-pair-1",
    };
    const response = { id: "user-1" };
    patchMock.mockResolvedValue(response);

    await expect(setActiveLanguagePair(input)).resolves.toBe(response);

    expect(patchMock).toHaveBeenCalledWith(
      "/me/active-language-pair",
      input,
    );
  });
});
