import { StyleSheet, Text, View } from "react-native";

import { useMeProfileQuery } from "@/entities/user";
import { useAuthFailureRedirect } from "@/features/auth";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

import { HomeBottomNav } from "./HomeBottomNav";
import { HomeDecksSection } from "./HomeDecksSection";
import { HomeTopBar } from "./HomeTopBar";
import { getHomeSummary } from "./home-summary";

export function HomeScreen() {
  const profileQuery = useMeProfileQuery();

  const homeSummary = getHomeSummary({
    profile: profileQuery.data,
  });
  const hasUnauthorizedError = useAuthFailureRedirect(profileQuery.error);

  return (
    <ScreenContainer
      backgroundColor={colors.backgroundWarm}
      contentStyle={styles.content}
      footer={<HomeBottomNav />}
    >
      <HomeTopBar activePairCodeLabel={homeSummary.activePairCodeLabel} />

      {profileQuery.isError && !hasUnauthorizedError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Could not load your profile.</Text>
          <Button title="Try again" variant="secondary" onPress={() => void profileQuery.refetch()} />
        </View>
      ) : null}

      <HomeDecksSection />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
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
});
