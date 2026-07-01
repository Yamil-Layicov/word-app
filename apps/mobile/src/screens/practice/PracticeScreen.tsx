import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { type PracticeItem, usePracticeItemsQuery } from "@/entities/practice";
import { useAuthFailureRedirect } from "@/features/auth";
import { useAnswerPractice } from "@/features/practice";
import { isApiError } from "@/shared/api/http-error";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

export function PracticeScreen() {
  const router = useRouter();
  const practiceQuery = usePracticeItemsQuery({ limit: 20 });
  const answerPracticeMutation = useAnswerPractice();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const hasUnauthorizedError = useAuthFailureRedirect(
    practiceQuery.error ?? answerPracticeMutation.error,
  );

  const items = practiceQuery.data?.items ?? [];
  const currentItem = items[currentIndex] ?? null;
  const isAnswering = answerPracticeMutation.isPending;
  const missedCount = answeredCount - correctCount;

  const goToNextCard = () => {
    setIsAnswerVisible(false);

    if (currentIndex < items.length - 1) {
      setCurrentIndex((value) => value + 1);
    } else {
      setIsSessionComplete(true);
    }
  };

  const handleAnswer = async (isCorrect: boolean) => {
    if (!currentItem) {
      return;
    }

    setNotice(null);

    try {
      await answerPracticeMutation.mutateAsync({
        userWordId: currentItem.userWordId,
        isCorrect,
        practiceMode: "FLASHCARD",
      });

      setAnsweredCount((value) => value + 1);

      if (isCorrect) {
        setCorrectCount((value) => value + 1);
      }

      goToNextCard();
    } catch (error) {
      if (!isApiError(error) || error.status !== 401) {
        setNotice(isApiError(error) ? error.message : "Could not save practice answer.");
      }
    }
  };

  const handleSkip = () => {
    setNotice(null);
    setSkippedCount((value) => value + 1);
    goToNextCard();
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsAnswerVisible(false);
    setIsSessionComplete(false);
    setAnsweredCount(0);
    setCorrectCount(0);
    setSkippedCount(0);
    setNotice(null);
    void practiceQuery.refetch();
  };

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
          <Ionicons name="flash-outline" size={30} color={colors.white} />
        </View>
        <Text style={styles.title}>Practice</Text>
        <Text style={styles.subtitle}>Run through saved words without changing the review schedule.</Text>
      </View>

      {practiceQuery.isLoading ? <StateBox title="Loading practice words..." /> : null}

      {practiceQuery.isError && !hasUnauthorizedError ? (
        <StateBox
          title="Could not load practice words."
          actionTitle="Try again"
          onAction={() => void practiceQuery.refetch()}
        />
      ) : null}

      {!practiceQuery.isLoading && !practiceQuery.isError && items.length === 0 ? (
        <StateBox title="No practice words yet. Add words to your vocabulary first." />
      ) : null}

      {currentItem && !isSessionComplete ? (
        <>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              Card {currentIndex + 1} of {items.length}
            </Text>
            <Text style={styles.statusText}>{formatStatusLabel(currentItem.status)}</Text>
          </View>

          <View style={styles.statsRow}>
            <SessionStat label="Answered" value={answeredCount} />
            <SessionStat label="Correct" value={correctCount} />
            <SessionStat label="Missed" value={missedCount} />
            <SessionStat label="Skipped" value={skippedCount} />
          </View>

          <PracticeCard item={currentItem} isAnswerVisible={isAnswerVisible} />

          {notice ? <Text style={styles.noticeError}>{notice}</Text> : null}

          {isAnswerVisible ? (
            <View style={styles.answerActions}>
              <Button
                disabled={isAnswering}
                title="I missed it"
                variant="secondary"
                style={styles.answerButton}
                onPress={() => {
                  void handleAnswer(false);
                }}
              />
              <Button
                disabled={isAnswering}
                loading={isAnswering}
                title="I knew it"
                style={styles.answerButton}
                onPress={() => {
                  void handleAnswer(true);
                }}
              />
            </View>
          ) : (
            <View style={styles.answerActions}>
              <Button
                disabled={isAnswering}
                title="Skip"
                variant="secondary"
                style={styles.answerButton}
                onPress={handleSkip}
              />
              <Button
                disabled={isAnswering}
                title="Show answer"
                style={styles.answerButton}
                onPress={() => setIsAnswerVisible(true)}
              />
            </View>
          )}
        </>
      ) : null}

      {items.length > 0 && isSessionComplete ? (
        <View style={styles.completeCard}>
          <Ionicons name="checkmark-circle" size={42} color={colors.green} />
          <Text style={styles.completeTitle}>Practice complete</Text>
          <Text style={styles.completeText}>
            You answered {answeredCount} and skipped {skippedCount} flashcards: {correctCount} correct and{" "}
            {missedCount} missed.
          </Text>
          <Button title="Practice again" style={styles.restartButton} onPress={handleRestart} />
        </View>
      ) : null}
    </ScreenContainer>
  );
}

type SessionStatProps = {
  label: string;
  value: number;
};

function SessionStat({ label, value }: SessionStatProps) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type PracticeCardProps = {
  item: PracticeItem;
  isAnswerVisible: boolean;
};

function PracticeCard({ item, isAnswerVisible }: PracticeCardProps) {
  const firstExample = item.examples[0];

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Source</Text>
      <Text style={styles.sourceText}>{item.sourceText}</Text>

      <View style={styles.divider} />

      {isAnswerVisible ? (
        <>
          <Text style={styles.cardLabel}>Answer</Text>
          <Text style={styles.targetText}>{item.targetText}</Text>
          {item.definition ? <Text style={styles.definitionText}>{item.definition}</Text> : null}
          {firstExample ? (
            <View style={styles.exampleBox}>
              <Text style={styles.exampleSource}>{firstExample.sourceSentence}</Text>
              <Text style={styles.exampleTarget}>{firstExample.targetSentence}</Text>
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.hiddenAnswer}>
          <Ionicons name="eye-outline" size={22} color={colors.textMuted} />
          <Text style={styles.hiddenAnswerText}>Reveal the answer when you are ready.</Text>
        </View>
      )}
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

function formatStatusLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.slice(0, 1) + part.slice(1).toLowerCase())
    .join(" ");
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
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  progressText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: typography.weights.semibold,
  },
  statusText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: typography.weights.bold,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    minHeight: 64,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  statValue: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: typography.weights.black,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
  },
  card: {
    minHeight: 360,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    padding: spacing.xl,
    justifyContent: "center",
  },
  cardLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: typography.weights.bold,
    textTransform: "uppercase",
  },
  sourceText: {
    color: colors.navy,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: typography.weights.black,
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },
  targetText: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: typography.weights.black,
    marginTop: spacing.sm,
  },
  definitionText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: typography.weights.medium,
    marginTop: spacing.md,
  },
  exampleBox: {
    borderRadius: radii.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  exampleSource: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: typography.weights.bold,
  },
  exampleTarget: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: typography.weights.medium,
  },
  hiddenAnswer: {
    alignItems: "center",
    gap: spacing.sm,
  },
  hiddenAnswerText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: typography.weights.medium,
    textAlign: "center",
  },
  answerActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  answerButton: {
    flex: 1,
  },
  noticeError: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: typography.weights.medium,
    textAlign: "center",
    marginTop: spacing.md,
  },
  completeCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  completeTitle: {
    color: colors.navy,
    fontSize: 24,
    fontWeight: typography.weights.black,
    textAlign: "center",
  },
  completeText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: typography.weights.medium,
    textAlign: "center",
  },
  restartButton: {
    alignSelf: "stretch",
    marginTop: spacing.sm,
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
