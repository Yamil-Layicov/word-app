export const GOOGLE_SIGN_IN_ERROR_CODE = {
  configuration: "CONFIGURATION",
  inProgress: "IN_PROGRESS",
  playServices: "PLAY_SERVICES",
  unavailable: "UNAVAILABLE",
  unknown: "UNKNOWN",
} as const;

export type GoogleSignInErrorCode =
  (typeof GOOGLE_SIGN_IN_ERROR_CODE)[keyof typeof GOOGLE_SIGN_IN_ERROR_CODE];

export type GoogleIdTokenResult =
  | {
      status: "SUCCESS";
      idToken: string;
    }
  | {
      status: "CANCELLED";
    };

export class GoogleSignInClientError extends Error {
  constructor(
    readonly code: GoogleSignInErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GoogleSignInClientError";
  }
}

export function getGoogleSignInErrorMessage(error: unknown) {
  if (error instanceof GoogleSignInClientError) {
    return error.message;
  }

  return "Could not continue with Google. Please try again.";
}
