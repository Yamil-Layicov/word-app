/// <reference types="jest" />

import {
  clearGoogleAuthDraft,
  getGoogleAuthDraft,
  saveGoogleAuthDraft,
} from "../google-auth-draft";

describe("google auth draft", () => {
  afterEach(() => {
    clearGoogleAuthDraft();
  });

  it("keeps the credential only until onboarding is completed", () => {
    saveGoogleAuthDraft({
      idToken: "google-id-token",
      profile: {
        email: "user@example.com",
        displayName: "Google User",
      },
    });

    expect(getGoogleAuthDraft()).toEqual({
      idToken: "google-id-token",
      profile: {
        email: "user@example.com",
        displayName: "Google User",
      },
    });

    clearGoogleAuthDraft();

    expect(getGoogleAuthDraft()).toBeNull();
  });
});
