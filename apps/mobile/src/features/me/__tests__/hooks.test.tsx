/// <reference types="jest" />

import { renderHook } from "@testing-library/react-native";

import {
  setActiveLanguagePair,
  updateMeProfile,
  userQueryKeys,
  type MeProfile,
  type SetActiveLanguagePairRequest,
  type UpdateMeProfileRequest,
} from "@/entities/user";
import {
  addMeLanguagePair,
  userLanguagePairQueryKeys,
  type AddMeLanguagePairRequest,
  type UserLanguagePair,
} from "@/entities/user-language-pair";
import { queryClient } from "@/shared/lib/query-client";
import { useAddLanguagePair } from "../hooks/useAddLanguagePair";
import { useSetActiveLanguagePair } from "../hooks/useSetActiveLanguagePair";
import { useUpdateProfile } from "../hooks/useUpdateProfile";

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn((options: unknown) => options),
}));

jest.mock("@/entities/user", () => ({
  ...jest.requireActual("@/entities/user/query-keys"),
  setActiveLanguagePair: jest.fn(),
  updateMeProfile: jest.fn(),
}));

jest.mock("@/entities/user-language-pair", () => ({
  ...jest.requireActual("@/entities/user-language-pair/query-keys"),
  addMeLanguagePair: jest.fn(),
}));

jest.mock("@/shared/lib/query-client", () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
  },
}));

const mockAddMeLanguagePair = jest.mocked(addMeLanguagePair);
const mockSetActiveLanguagePair = jest.mocked(setActiveLanguagePair);
const mockUpdateMeProfile = jest.mocked(updateMeProfile);
const mockInvalidateQueries = jest.mocked(queryClient.invalidateQueries);
const mockSetQueryData = jest.mocked(queryClient.setQueryData);

type MutationOptions<TData, TVariables> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess: (data: TData, variables: TVariables) => void;
};

const profile = createProfile();
const languagePairs = createLanguagePairs();

describe("me mutation cache behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stores added language pairs and refreshes the profile", async () => {
    const request: AddMeLanguagePairRequest = {
      languagePairId: "language-pair-2",
      targetCefrLevel: "B1",
    };
    mockAddMeLanguagePair.mockResolvedValue(languagePairs);
    const mutation = getAddLanguagePairMutation();

    const response = await mutation.mutationFn(request);
    mutation.onSuccess(response, request);

    expect(mockAddMeLanguagePair).toHaveBeenCalledWith(request);
    expect(mockSetQueryData).toHaveBeenCalledWith(
      userLanguagePairQueryKeys.list(),
      languagePairs,
    );
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: userQueryKeys.profile(),
    });
  });

  it("updates profile and language-pair caches when the active pair changes", async () => {
    const request: SetActiveLanguagePairRequest = {
      languagePairId: "language-pair-2",
    };
    mockSetActiveLanguagePair.mockResolvedValue(profile);
    const mutation = getSetActiveLanguagePairMutation();

    const response = await mutation.mutationFn(request);
    mutation.onSuccess(response, request);

    expect(mockSetActiveLanguagePair).toHaveBeenCalledWith(request);
    expect(mockSetQueryData).toHaveBeenNthCalledWith(
      1,
      userQueryKeys.profile(),
      profile,
    );
    expect(mockSetQueryData).toHaveBeenNthCalledWith(
      2,
      userLanguagePairQueryKeys.list(),
      expect.any(Function),
    );

    const updateLanguagePairs = mockSetQueryData.mock.calls[1]?.[1] as (
      current: UserLanguagePair[] | undefined,
    ) => UserLanguagePair[] | undefined;

    expect(updateLanguagePairs(languagePairs)?.map((pair) => pair.isActive)).toEqual([
      false,
      true,
    ]);
    expect(updateLanguagePairs(undefined)).toBeUndefined();
    expect(mockInvalidateQueries).toHaveBeenCalledWith();
  });

  it("stores an updated profile without invalidating unrelated data", async () => {
    const request: UpdateMeProfileRequest = { displayName: "Yamil" };
    mockUpdateMeProfile.mockResolvedValue(profile);
    const mutation = getUpdateProfileMutation();

    const response = await mutation.mutationFn(request);
    mutation.onSuccess(response, request);

    expect(mockUpdateMeProfile).toHaveBeenCalledWith(request);
    expect(mockSetQueryData).toHaveBeenCalledWith(
      userQueryKeys.profile(),
      profile,
    );
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it("does not update caches when changing the active pair fails", async () => {
    const request: SetActiveLanguagePairRequest = {
      languagePairId: "language-pair-2",
    };
    mockSetActiveLanguagePair.mockRejectedValue(new Error("Request failed"));
    const mutation = getSetActiveLanguagePairMutation();

    await expect(mutation.mutationFn(request)).rejects.toThrow(
      "Request failed",
    );

    expect(mockSetQueryData).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
});

function getAddLanguagePairMutation() {
  const { result } = renderHook(() => useAddLanguagePair());

  return result.current as unknown as MutationOptions<
    UserLanguagePair[],
    AddMeLanguagePairRequest
  >;
}

function getSetActiveLanguagePairMutation() {
  const { result } = renderHook(() => useSetActiveLanguagePair());

  return result.current as unknown as MutationOptions<
    MeProfile,
    SetActiveLanguagePairRequest
  >;
}

function getUpdateProfileMutation() {
  const { result } = renderHook(() => useUpdateProfile());

  return result.current as unknown as MutationOptions<
    MeProfile,
    UpdateMeProfileRequest
  >;
}

function createProfile(): MeProfile {
  return {
    id: "user-1",
    email: "user@example.com",
    role: "USER",
    status: "ACTIVE",
    profile: {
      id: "profile-1",
      displayName: "Yamil",
      countryCode: "AZ",
      interfaceLanguage: "en",
      activeLanguagePairId: "language-pair-2",
    },
    activeLanguagePair: null,
    createdAt: "2026-08-01T08:00:00.000Z",
  };
}

function createLanguagePairs(): UserLanguagePair[] {
  const language = {
    id: "language-1",
    code: "en",
    name: "English",
    nativeName: "English",
  };

  return [
    {
      id: "user-language-pair-1",
      languagePairId: "language-pair-1",
      languagePair: {
        id: "language-pair-1",
        sourceLanguage: language,
        targetLanguage: { ...language, id: "language-2", code: "az", name: "Azerbaijani" },
      },
      isLearning: true,
      targetCefrLevel: "A2",
      isActive: true,
      createdAt: "2026-08-01T08:00:00.000Z",
    },
    {
      id: "user-language-pair-2",
      languagePairId: "language-pair-2",
      languagePair: {
        id: "language-pair-2",
        sourceLanguage: language,
        targetLanguage: { ...language, id: "language-3", code: "tr", name: "Turkish" },
      },
      isLearning: true,
      targetCefrLevel: "B1",
      isActive: false,
      createdAt: "2026-08-02T08:00:00.000Z",
    },
  ];
}
