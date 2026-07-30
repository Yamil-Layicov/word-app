import type { GoogleAuthProfile } from "./model";

export type GoogleAuthDraft = {
  idToken: string;
  profile: GoogleAuthProfile;
};

let googleAuthDraft: GoogleAuthDraft | null = null;

export function saveGoogleAuthDraft(draft: GoogleAuthDraft) {
  googleAuthDraft = draft;
}

export function getGoogleAuthDraft() {
  return googleAuthDraft;
}

export function clearGoogleAuthDraft() {
  googleAuthDraft = null;
}
