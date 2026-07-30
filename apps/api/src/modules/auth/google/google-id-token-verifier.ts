export const GOOGLE_ID_TOKEN_VERIFIER = Symbol('GOOGLE_ID_TOKEN_VERIFIER');

export type GoogleIdentityClaims = {
  subject: string;
  email: string;
  displayName?: string;
  pictureUrl?: string;
};

export interface GoogleIdTokenVerifier {
  verify(idToken: string): Promise<GoogleIdentityClaims>;
}
