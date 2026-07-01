import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useVocabularyItemQuery } from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

export function VocabularyDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const vocabularyItemId = typeof params.id === "string" ? params.id : "";
  const vocabularyItemQuery = useVocabularyItemQuery(vocabularyItemId);
  const hasUnauthorizedError = useAuthFailureRedirect(vocabularyItemQuery.error);
  const item = vocabularyItemQuery.data;

  return (
    <ScreenContainer backgroundColor={colors.backgroundWarm} contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.orange} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>

      {vocabularyItemQuery.isLoading ? <StateBox title="Loading word..." /> : null}

      {vocabularyItemQuery.isError && !hasUnauthorizedError ? (
        <StateBox
          title="Could not load this word."
          actionTitle="Try again"
          onAction={() => void vocabularyItemQuery.refetch()}
        />
      ) : null}

      {item ? (
        <>
          <View style={styles.header}>
            <View style={styles.iconShell}>
              <Ionicons name="book-outline" size={30} color={colors.white} />
            </View>
            <Text style={styles.sourceText}>{item.sourceText}</Text>
            <Text style={styles.targetText}>{item.targetText}</Text>
            <Text style={styles.metaText}>
              {item.wordType.replace("_", " ").toLowerCase()} · {item.cefrLevel || "No level"} ·{" "}
              {item.userWord.status.toLowerCase()}
            </Text>
          </View>

          <View style={styles.card}>
            <InfoRow label="Definition" value={item.definition || "Not set"} />
            <InfoRow label="Note" value={item.note || "Not set"} />
            <InfoRow label="Favorite" value={item.userWord.isFavorite ? "Yes" : "No"} />
            <InfoRow label="Reviews" value={String(item.userWord.reviewCount)} />
            <InfoRow label="Correct / Wrong" value={`${item.userWord.correctCount} / ${item.userWord.wrongCount}`} />
            <InfoRow label="Next review" value={formatOptionalDate(item.userWord.nextReviewAt)} />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Examples</Text>
          </View>

          {item.examples.length === 0 ? <StateBox title="No examples added." /> : null}

          {item.examples.map((example) => (
            <View key={example.id} style={styles.exampleCard}>
              <Text style={styles.exampleSource}>{example.sourceSentence}</Text>
              <Text style={styles.exampleTarget}>{example.targetSentence}</Text>
            </View>
          ))}
        </>
      ) : null}
    </ScreenContainer>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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

function formatOptionalDate(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Date(value).toLocaleDateString();
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
  sourceText: {
    color: colors.navy,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: typography.weights.black,
    textAlign: "center",
  },
  targetText: {
    color: colors.textMuted,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: typography.weights.bold,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  metaText: {
    color: colors.green,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: typography.weights.medium,
    textAlign: "center",
    textTransform: "capitalize",
    marginTop: spacing.sm,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoRow: {
    gap: spacing.xs,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: typography.weights.semibold,
  },
  infoValue: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: typography.weights.bold,
  },
  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: typography.weights.black,
  },
  exampleCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  exampleSource: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: typography.weights.bold,
  },
  exampleTarget: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: typography.weights.medium,
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
