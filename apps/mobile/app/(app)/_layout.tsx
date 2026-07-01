import { Redirect, Stack } from "expo-router";

import { getAccessToken } from "@/auth";

export default function AppLayout() {
  if (!getAccessToken()) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
