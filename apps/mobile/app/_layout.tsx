import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthSessionProvider, useAuthSession } from "@/features/auth";
import {
  configureNotificationHandler,
  NotificationNavigationObserver,
} from "@/features/push-notifications";
import { queryClient } from "@/shared/lib/query-client";
import { colors, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

configureNotificationHandler();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthSessionProvider>
            <RootNavigator />
          </AuthSessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { retryRestore, status } = useAuthSession();

  if (status === "restoring") {
    return (
      <SessionStateView>
        <ActivityIndicator color={colors.orange} size="large" />
      </SessionStateView>
    );
  }

  if (status === "restore-error") {
    return (
      <SessionStateView>
        <Text style={styles.stateTitle}>Could not restore your session.</Text>
        <Text style={styles.stateText}>Check your connection and try again.</Text>
        <Button title="Try again" style={styles.retryButton} onPress={retryRestore} />
      </SessionStateView>
    );
  }

  return (
    <>
      <NotificationNavigationObserver />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

function SessionStateView({ children }: PropsWithChildren) {
  return (
    <View style={styles.stateScreen}>
      <View style={styles.stateContent}>{children}</View>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  stateScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundWarm,
    padding: spacing.xl,
  },
  stateContent: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: spacing.md,
  },
  stateTitle: {
    color: colors.navy,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: typography.weights.bold,
    textAlign: "center",
  },
  stateText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: typography.weights.medium,
    textAlign: "center",
  },
  retryButton: {
    width: "100%",
    marginTop: spacing.sm,
  },
});
