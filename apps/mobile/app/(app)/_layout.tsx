import { Redirect, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

import { getAccessToken } from "@/auth";
import { AppBottomNav } from "@/shared/navigation/AppBottomNav";
import { colors } from "@/shared/theme";

export default function AppLayout() {
  if (!getAccessToken()) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.shell}>
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      <AppBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.backgroundWarm,
  },
  content: {
    flex: 1,
  },
});
