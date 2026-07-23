export type PushPlatform = "ANDROID" | "IOS";

export type RegisterPushTokenRequest = {
  token: string;
  platform: PushPlatform;
};
