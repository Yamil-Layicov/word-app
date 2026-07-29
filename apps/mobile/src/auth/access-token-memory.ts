let accessToken: string | null = null;
let accessTokenSessionVersion = 0;

export function getAccessToken() {
  return accessToken;
}

export function getAccessTokenSessionVersion() {
  return accessTokenSessionVersion;
}

export function beginAccessTokenSession(token: string) {
  accessTokenSessionVersion += 1;
  accessToken = token;
}

export function setAccessToken(token: string) {
  accessToken = token;
}

export function clearAccessToken() {
  accessTokenSessionVersion += 1;
  accessToken = null;
}
