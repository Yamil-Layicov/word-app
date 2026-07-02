import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "@/shared/theme";

type LanguagePairSummaryCardProps = {
  activePairLabel: string;
  isLoading: boolean;
  languagePairCount: number;
};

export function LanguagePairSummaryCard({
  activePairLabel,
  isLoading,
  languagePairCount,
}: LanguagePairSummaryCardProps) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>Active language pair</Text>
      <Text style={styles.summaryValue}>{activePairLabel}</Text>
      <Text style={styles.summaryMeta}>
        {isLoading
          ? "Loading language pairs..."
          : `${languagePairCount} language pair${languagePairCount === 1 ? "" : "s"}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
