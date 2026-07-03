import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useVocabularyItemsQuery } from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import { REVIEW_INTERVALS, useReviewBoxesState } from "@/features/review-boxes";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";
import { VocabularyWordRow } from "@/screens/vocabulary/VocabularyWordRow";

export function ReviewBoxDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ boxId?: string | string[] }>();
  const boxId = getParamValue(params.boxId);
  const { scheduledWords } = useReviewBoxesState();
  const vocabularyQuery = useVocabularyItemsQuery({ limit: 100 });
  const hasUnauthorizedError = useAuthFailureRedirect(vocabularyQuery.error);
  const interval = REVIEW_INTERVALS.find((item) => item.label === boxId);
  const isMasteredBox = boxId === "mastered";
  const vocabularyItems = vocabularyQuery.data?.items ?? [];
  const items = isMasteredBox
    ? vocabularyItems.filter((item) => item.userWord.status === "MASTERED")
    : vocabularyItems.filter((item) => scheduledWords[item.id]?.intervalLabel === interval?.label);
  const title = isMasteredBox ? "Mastered Words" : `${interval?.label ?? "Review"} box`;
  const subtitle = isMasteredBox
    ? "Words you marked as fully known."
    : "Tap a word to review its details.";

  return (
    <ScreenContainer backgroundColor={colors.backgroundWarm} contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={styles.iconButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={25} color={colors.textMuted} />
        </Pressable>
        <View style={styles.headerText}>
          <Text numberOfLines={1} style={styles.title}>{title}</Text>
          <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      {!interval && !isMasteredBox ? (
        <StateBox title="Review box not found." />
      ) : null}

      {vocabularyQuery.isLoading ? <StateBox title="Loading words..." /> : null}

      {vocabularyQuery.isError && !hasUnauthorizedError ? (
        <StateBox
          title="Could not load words."
          actionTitle="Try again"
          onAction={() => void vocabularyQuery.refetch()}
        />
      ) : null}

      {!vocabularyQuery.isLoading &&
      !vocabularyQuery.isError &&
      (interval || isMasteredBox) &&
      items.length === 0 ? (
        <StateBox title="No words in this box yet." />
      ) : null}

      {items.map((item) => (
        <VocabularyWordRow
          key={item.id}
          item={item}
          onPress={() =>
            router.push({
              pathname: "/vocabulary/[id]",
              params: { id: item.id },
            })
          }
        />
      ))}
    </ScreenContainer>
  );
}

type StateBoxProps = {
  title: string;
  actionTitle?: string;
  onAction?: () => void;
};

function StateBox({ title, actionTitle, onAction }: StateBoxProps) {
  return (
    <View style={styles.stateBox}>
      <Text style={styles.stateTitle}>{title}</Text>
      {actionTitle && onAction ? (
        <Button title={actionTitle} variant="secondary" onPress={onAction} />
      ) : null}
    </View>
  );
}

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: 0,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.navy,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: typography.weights.black,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  stateBox: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.lg,
    gap: spacing.md,
    marginHorizontal: spacing.lg,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: typography.weights.bold,
    textAlign: "center",
  },
});
