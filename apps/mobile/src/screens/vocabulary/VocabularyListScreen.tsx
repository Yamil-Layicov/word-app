import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { type VocabularyItem, useVocabularyItemsQuery } from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

export function VocabularyListScreen() {
  const router = useRouter();
  const vocabularyQuery = useVocabularyItemsQuery({ limit: 20 });
  const hasUnauthorizedError = useAuthFailureRedirect(vocabularyQuery.error);
  const items = vocabularyQuery.data?.items ?? [];

  return (
    <ScreenContainer backgroundColor={colors.backgroundWarm} contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.orange} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>

      <View style={styles.header}>
        <View style={styles.iconShell}>
          <Ionicons name="library-outline" size={30} color={colors.white} />
        </View>
        <Text style={styles.title}>Vocabulary</Text>
        <Text style={styles.subtitle}>Review the words saved to your active language pair.</Text>
      </View>

      {vocabularyQuery.isLoading ? <StateBox title="Loading vocabulary..." /> : null}

      {vocabularyQuery.isError && !hasUnauthorizedError ? (
        <StateBox
          title="Could not load vocabulary."
          actionTitle="Try again"
          onAction={() => void vocabularyQuery.refetch()}
        />
      ) : null}

      {!vocabularyQuery.isLoading && !vocabularyQuery.isError && items.length === 0 ? (
        <StateBox title="No words added yet." />
      ) : null}

      {items.map((item) => (
        <VocabularyRow key={item.id} item={item} />
      ))}
    </ScreenContainer>
  );
}

function VocabularyRow({ item }: { item: VocabularyItem }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name="book-outline" size={21} color={colors.navy} />
      </View>
      <View style={styles.rowText}>
        <View style={styles.wordLine}>
          <Text style={styles.sourceText}>{item.sourceText}</Text>
          {item.userWord.isFavorite ? (
            <Ionicons name="star" size={16} color={colors.orange} />
          ) : null}
        </View>
        <Text style={styles.targetText}>{item.targetText}</Text>
        <Text style={styles.metaText}>
          {item.wordType.replace("_", " ").toLowerCase()} · {item.cefrLevel || "No level"} ·{" "}
          {item.userWord.status.toLowerCase()}
        </Text>
      </View>
    </View>
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

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    minHeight: 40,
    justifyContent: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    minHeight: 36,
  },
  backText: {
    color: colors.orange,
    fontSize: 15,
    fontWeight: typography.weights.bold,
  },
  header: {
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  iconShell: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.navy,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: typography.weights.black,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: typography.weights.medium,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  row: {
    minHeight: 92,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  wordLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sourceText: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: typography.weights.black,
  },
  targetText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
  },
  metaText: {
    color: colors.green,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: typography.weights.medium,
    marginTop: spacing.xs,
    textTransform: "capitalize",
  },
  stateBox: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    padding: spacing.lg,
    gap: spacing.md,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: typography.weights.bold,
    textAlign: "center",
  },
});
