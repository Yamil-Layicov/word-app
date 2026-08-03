/// <reference types="jest" />

import { baseClient } from "@/shared/api/base-client";
import { listCountries, listLanguagePairs, listLanguages } from "../api";

jest.mock("@/shared/api/base-client", () => ({
  baseClient: {
    get: jest.fn(),
  },
}));

const getMock = baseClient.get as jest.Mock;

describe("public lookup API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists countries through the public API client", async () => {
    const response = [{ id: "country-1" }];
    getMock.mockResolvedValue(response);

    await expect(listCountries()).resolves.toBe(response);

    expect(getMock).toHaveBeenCalledWith("/countries");
  });

  it("lists languages through the public API client", async () => {
    const response = [{ id: "language-1" }];
    getMock.mockResolvedValue(response);

    await expect(listLanguages()).resolves.toBe(response);

    expect(getMock).toHaveBeenCalledWith("/languages");
  });

  it("lists language pairs through the public API client", async () => {
    const response = [{ id: "language-pair-1" }];
    getMock.mockResolvedValue(response);

    await expect(listLanguagePairs()).resolves.toBe(response);

    expect(getMock).toHaveBeenCalledWith("/language-pairs");
  });
});
