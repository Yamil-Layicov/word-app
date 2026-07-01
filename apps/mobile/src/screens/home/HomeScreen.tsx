import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useMeProfileQuery } from "@/entities/user";
import { useMeLanguagePairsQuery } from "@/entities/user-language-pair";
import { useAuthFailureRedirect, useLogout } from "@/features/auth";
import { appBrand } from "@/shared/config/brand";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

export function HomeScreen() {
  const logout = useLogout();
  const router = useRouter();
  const profileQuery = useMeProfileQuery();
  const languagePairsQuery = useMeLanguagePairsQuery();

  const displayName = profileQuery.data?.profile?.displayName;
  const userLabel = displayName || profileQuery.data?.email;
  const activeLanguagePair = profileQuery.data?.activeLanguagePair;
  const activePairLabel = activeLanguagePair
    ? `${activeLanguagePair.sourceLanguage.name} -> ${activeLanguagePair.targetLanguage.name}`
    : "No active language pair yet";
  const languagePairCount = languagePairsQuery.data?.length ?? 0;
  const hasUnauthorizedError = useAuthFailureRedirect(profileQuery.error);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <ScreenContainer backgroundColor={colors.backgroundWarm}>
      <View style={styles.content}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>W</Text>
        </View>
        <Text style={styles.title}>{appBrand.name}</Text>
        <Text style={styles.subtitle}>
          {profileQuery.isLoading
            ? "Loading your profile..."
            : userLabel
              ? `Signed in as ${userLabel}`
              : "App shell placeholder"}
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Active language pair</Text>
          <Text style={styles.summaryValue}>{activePairLabel}</Text>
          <Text style={styles.summaryMeta}>
            {languagePairsQuery.isLoading
              ? "Loading language pairs..."
              : `${languagePairCount} language pair${languagePairCount === 1 ? "" : "s"}`}
          </Text>
        </View>

        {profileQuery.isError && !hasUnauthorizedError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Could not load your profile.</Text>
            <Button title="Try again" variant="secondary" onPress={() => void profileQuery.refetch()} />
          </View>
        ) : null}

        <Button title="View profile" style={styles.profileButton} onPress={() => router.push("/profile")} />
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
  summaryCard: {
    width: "100%",
    maxWidth: 360,
    marginTop: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    padding: spacing.lg,
    alignItems: "center",
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: typography.weights.semibold,
  },
  summaryValue: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: typography.weights.bold,
    textAlign: "center",
  },
  summaryMeta: {
    marginTop: spacing.xs,
    color: colors.green,
    fontSize: 13,
    lineHeight: 19,
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
  profileButton: {
    marginTop: spacing.xl,
    minWidth: 180,
  },
  logoutButton: {
    marginTop: spacing.md,
    minWidth: 160,
  },
});
