import { StyleSheet, Text, View } from "react-native";

import { useMeProfileQuery } from "@/entities/user";
import { useMeLanguagePairsQuery } from "@/entities/user-language-pair";
import { useAuthFailureRedirect } from "@/features/auth";
import { appBrand } from "@/shared/config/brand";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

import { HomeActions } from "./HomeActions";
import { HomeHeader } from "./HomeHeader";
import { LanguagePairSummaryCard } from "./LanguagePairSummaryCard";
import { ReviewScheduleCard } from "./ReviewScheduleCard";
import { getHomeSummary } from "./home-summary";

export function HomeScreen() {
  const profileQuery = useMeProfileQuery();
  const languagePairsQuery = useMeLanguagePairsQuery();

  const homeSummary = getHomeSummary({
    isProfileLoading: profileQuery.isLoading,
    languagePairCount: languagePairsQuery.data?.length ?? 0,
    profile: profileQuery.data,
  });
  const hasUnauthorizedError = useAuthFailureRedirect(profileQuery.error);

  return (
    <ScreenContainer backgroundColor={colors.backgroundWarm} contentStyle={styles.content}>
      <HomeHeader title={appBrand.name} subtitle={homeSummary.headerSubtitle} />

      <LanguagePairSummaryCard
        activePairLabel={homeSummary.activePairLabel}
        isLoading={languagePairsQuery.isLoading}
        languagePairCount={homeSummary.languagePairCount}
      />

      {profileQuery.isError && !hasUnauthorizedError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Could not load your profile.</Text>
          <Button title="Try again" variant="secondary" onPress={() => void profileQuery.refetch()} />
        </View>
      ) : null}

      <ReviewScheduleCard />

      <HomeActions />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
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
