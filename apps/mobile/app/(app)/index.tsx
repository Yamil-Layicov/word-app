import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useCurrentUserQuery, useLogout } from "@/features/auth";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { appBrand } from "@/shared/config/brand";
import { colors, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

export default function AppHomeRoute() {
  const logout = useLogout();
  const router = useRouter();
  const currentUserQuery = useCurrentUserQuery();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const displayName = currentUserQuery.data?.profile?.displayName;
  const userLabel = displayName || currentUserQuery.data?.email;

  return (
    <ScreenContainer backgroundColor={colors.backgroundWarm}>
      <View style={styles.content}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>W</Text>
        </View>
        <Text style={styles.title}>{appBrand.name}</Text>
        <Text style={styles.subtitle}>
          {currentUserQuery.isLoading
            ? "Loading your profile..."
            : userLabel
              ? `Signed in as ${userLabel}`
              : "App shell placeholder"}
        </Text>
        {currentUserQuery.isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Could not load your profile.</Text>
            <Button title="Try again" variant="secondary" onPress={() => void currentUserQuery.refetch()} />
          </View>
        ) : null}
        <Button title="Log out" variant="secondary" style={styles.logoutButton} onPress={handleLogout} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy,
  },
  logoText: {
    color: colors.white,
    fontSize: 30,
    fontWeight: typography.weights.black,
  },
  title: {
    marginTop: spacing.lg,
    color: colors.navy,
    fontSize: 28,
    fontWeight: typography.weights.black,
  },
  subtitle: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: typography.weights.medium,
    textAlign: "center",
  },
  errorBox: {
    gap: spacing.md,
    marginTop: spacing.lg,
    alignItems: "center",
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: typography.weights.medium,
    textAlign: "center",
  },
  logoutButton: {
    marginTop: spacing.xl,
    minWidth: 160,
  },
});
