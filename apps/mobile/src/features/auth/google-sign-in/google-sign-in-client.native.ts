import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isErrorWithCode,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
  statusCodes,
  type OneTapResponse,
} from "react-native-nitro-google-signin";

import {
  GOOGLE_SIGN_IN_ERROR_CODE,
  GoogleSignInClientError,
  type GoogleIdTokenResult,
} from "./google-sign-in.types";

let isConfigured = false;

export function isGoogleSignInSupported() {
  return true;
}

export async function requestGoogleIdToken(): Promise<GoogleIdTokenResult> {
  try {
    configureOnce();
    await GoogleOneTapSignIn.checkPlayServices();

    let response = await GoogleOneTapSignIn.signIn();

    if (isNoSavedCredentialFoundResponse(response)) {
      response = await GoogleOneTapSignIn.createAccount();
    }

    if (isNoSavedCredentialFoundResponse(response)) {
      response = await GoogleOneTapSignIn.presentExplicitSignIn();
    }

    return getIdTokenResult(response);
  } catch (error) {
    if (
      isErrorWithCode(error) &&
      error.code === statusCodes.SIGN_IN_CANCELLED
    ) {
      return { status: "CANCELLED" };
    }

    throw mapNativeError(error);
  }
}

function configureOnce() {
  if (isConfigured) {
    return;
  }

  GoogleOneTapSignIn.configure({
    webClientId: "autoDetect",
    offlineAccess: false,
    autoSelectOnSignIn: false,
  });
  isConfigured = true;
}

function getIdTokenResult(response: OneTapResponse): GoogleIdTokenResult {
  if (isCancelledResponse(response)) {
    return { status: "CANCELLED" };
  }

  if (isSuccessResponse(response) && response.data.idToken) {
    return {
      status: "SUCCESS",
      idToken: response.data.idToken,
    };
  }

  throw new GoogleSignInClientError(
    GOOGLE_SIGN_IN_ERROR_CODE.unknown,
    "Google did not return a valid sign-in credential. Please try again.",
  );
}

function mapNativeError(error: unknown) {
  if (!isErrorWithCode(error)) {
    return new GoogleSignInClientError(
      GOOGLE_SIGN_IN_ERROR_CODE.unknown,
      "Could not continue with Google. Please try again.",
    );
  }

  if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return new GoogleSignInClientError(
      GOOGLE_SIGN_IN_ERROR_CODE.playServices,
      "Google Play Services is unavailable or needs to be updated.",
    );
  }

  if (error.code === statusCodes.DEVELOPER_ERROR) {
    return new GoogleSignInClientError(
      GOOGLE_SIGN_IN_ERROR_CODE.configuration,
      "Google sign-in is not configured for this app build.",
    );
  }

  if (error.code === statusCodes.IN_PROGRESS) {
    return new GoogleSignInClientError(
      GOOGLE_SIGN_IN_ERROR_CODE.inProgress,
      "Google sign-in is already in progress.",
    );
  }

  return new GoogleSignInClientError(
    GOOGLE_SIGN_IN_ERROR_CODE.unknown,
    "Could not continue with Google. Please try again.",
  );
}
