import {
  GOOGLE_SIGN_IN_ERROR_CODE,
  GoogleSignInClientError,
  type GoogleIdTokenResult,
} from "./google-sign-in.types";

export function isGoogleSignInSupported() {
  return false;
}

export async function requestGoogleIdToken(): Promise<GoogleIdTokenResult> {
  throw new GoogleSignInClientError(
    GOOGLE_SIGN_IN_ERROR_CODE.unavailable,
    "Google sign-in is available in the Android and iOS app.",
  );
}
