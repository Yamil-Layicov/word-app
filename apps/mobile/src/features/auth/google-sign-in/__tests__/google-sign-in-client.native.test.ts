/// <reference types="jest" />

import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
} from "react-native-nitro-google-signin";

import {
  clearGoogleSignInSession,
  requestGoogleIdToken,
} from "../google-sign-in-client.native";

jest.mock("react-native-nitro-google-signin", () => ({
  GoogleOneTapSignIn: {
    checkPlayServices: jest.fn(),
    configure: jest.fn(),
    createAccount: jest.fn(),
    presentExplicitSignIn: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
  isCancelledResponse: jest.fn(),
  isErrorWithCode: jest.fn(),
  isSuccessResponse: jest.fn(),
  statusCodes: {
    DEVELOPER_ERROR: "DEVELOPER_ERROR",
    IN_PROGRESS: "IN_PROGRESS",
    PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
  },
}));

const checkPlayServicesMock = GoogleOneTapSignIn.checkPlayServices as jest.Mock;
const createAccountMock = GoogleOneTapSignIn.createAccount as jest.Mock;
const presentExplicitSignInMock =
  GoogleOneTapSignIn.presentExplicitSignIn as jest.Mock;
const signInMock = GoogleOneTapSignIn.signIn as jest.Mock;
const signOutMock = GoogleOneTapSignIn.signOut as jest.Mock;
const isCancelledResponseMock = isCancelledResponse as unknown as jest.Mock;
const isErrorWithCodeMock = isErrorWithCode as unknown as jest.Mock;
const isSuccessResponseMock = isSuccessResponse as unknown as jest.Mock;

describe("native Google sign-in client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    checkPlayServicesMock.mockResolvedValue(undefined);
    presentExplicitSignInMock.mockResolvedValue({
      type: "success",
      data: { idToken: "google-id-token" },
    });
    signOutMock.mockResolvedValue(undefined);
    isCancelledResponseMock.mockReturnValue(false);
    isErrorWithCodeMock.mockReturnValue(false);
    isSuccessResponseMock.mockReturnValue(true);
  });

  it("always opens the explicit account chooser", async () => {
    await expect(requestGoogleIdToken()).resolves.toEqual({
      status: "SUCCESS",
      idToken: "google-id-token",
    });

    expect(checkPlayServicesMock).toHaveBeenCalledTimes(1);
    expect(presentExplicitSignInMock).toHaveBeenCalledTimes(1);
    expect(signInMock).not.toHaveBeenCalled();
    expect(createAccountMock).not.toHaveBeenCalled();
  });

  it("clears the native Google credential session", async () => {
    await clearGoogleSignInSession();

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});
