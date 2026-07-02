import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { type DueReviewItem, type ReviewRating, useDueReviewsQuery } from "@/entities/review";
import { useAuthFailureRedirect } from "@/features/auth";
import { useAnswerReview } from "@/features/review";
import { isApiError } from "@/shared/api/http-error";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

const REVIEW_LIMIT = 20;

const RATING_OPTIONS: { label: string; rating: ReviewRating; description: string }[] = [
  { label: "Again", rating: "AGAIN", description: "Review again soon" },
  { label: "Hard", rating: "HARD", description: "Remembered with effort" },
  { label: "Good", rating: "GOOD", description: "Remembered correctly" },
  { label: "Easy", rating: "EASY", description: "Remembered quickly" },
];

export function ReviewScreen() {
  const router = useRouter();
  const dueReviewsQuery = useDueReviewsQuery({ limit: REVIEW_LIMIT });
  const answerReviewMutation = useAnswerReview();
  const [answeredUserWordIds, setAnsweredUserWordIds] = useState<string[]>([]);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [againCount, setAgainCount] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const hasUnauthorizedError = useAuthFailureRedirect(
    dueReviewsQuery.error ?? answerReviewMutation.error,
  );

  const dueItems = useMemo(() => dueReviewsQuery.data?.items ?? [], [dueReviewsQuery.data?.items]);
  const visibleItems = useMemo(
    () => dueItems.filter((item) => !answeredUserWordIds.includes(item.userWordId)),
    [answeredUserWordIds, dueItems],
  );
  const currentItem = visibleItems[0] ?? null;
  const isAnswering = answerReviewMutation.isPending;
  const isSessionComplete = reviewedCount > 0 && !currentItem;
  const hasNoDueReviews = !dueReviewsQuery.isLoading && !dueReviewsQuery.isError && dueItems.length === 0;

  const handleAnswer = async (rating: ReviewRating) => {
    if (!currentItem) {
      return;
    }

    const isCorrect = rating !== "AGAIN";
    setNotice(null);

    try {
      await answerReviewMutation.mutateAsync({
        userWordId: currentItem.userWordId,
        rating,
        isCorrect,
      });

      setAnsweredUserWordIds((value) => [...value, currentItem.userWordId]);
      setReviewedCount((value) => value + 1);
      setIsAnswerVisible(false);

      if (isCorrect) {
        setCorrectCount((value) => value + 1);
      } else {
        setAgainCount((value) => value + 1);
      }
    } catch (error) {
      if (!isApiError(error) || error.status !== 401) {
        setNotice(isApiError(error) ? error.message : "Could not save review answer.");
      }
    }
  };

  const handleRestart = () => {
    setAnsweredUserWordIds([]);
    setIsAnswerVisible(false);
    setReviewedCount(0);
    setCorrectCount(0);
    setAgainCount(0);
    setNotice(null);
    void dueReviewsQuery.refetch();
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
          <Ionicons name="refresh-outline" size={30} color={colors.white} />
        </View>
        <Text style={styles.title}>Review</Text>
        <Text style={styles.subtitle}>Answer due words and update your review schedule.</Text>
      </View>

      {dueReviewsQuery.isLoading ? <StateBox title="Loading due reviews..." /> : null}

      {dueReviewsQuery.isError && !hasUnauthorizedError ? (
        <StateBox
          title="Could not load due reviews."
          actionTitle="Try again"
          onAction={() => void dueReviewsQuery.refetch()}
        />
      ) : null}

      {hasNoDueReviews ? (
        <>
          <StateBox title="No reviews due right now." />
          <View style={styles.emptyActions}>
            <Button
              title="Practice flashcards"
              variant="secondary"
              onPress={() => router.push("/practice")}
            />
            <Button
              title="View vocabulary"
              variant="secondary"
              onPress={() => router.push("/vocabulary")}
            />
          </View>
        </>
      ) : null}

      {currentItem ? (
        <>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{visibleItems.length} due in this session</Text>
            <Text style={styles.statusText}>{formatStatusLabel(currentItem.status)}</Text>
          </View>

          <View style={styles.statsRow}>
            <SessionStat label="Reviewed" value={reviewedCount} />
            <SessionStat label="Correct" value={correctCount} />
            <SessionStat label="Again" value={againCount} />
          </View>

          <ReviewCard item={currentItem} isAnswerVisible={isAnswerVisible} />

          {notice ? <Text style={styles.noticeError}>{notice}</Text> : null}

          {isAnswerVisible ? (
            <View style={styles.ratingGrid}>
              {RATING_OPTIONS.map((option) => (
                <RatingButton
                  key={option.rating}
                  disabled={isAnswering}
                  label={option.label}
                  description={option.description}
                  rating={option.rating}
                  onPress={() => {
                    void handleAnswer(option.rating);
                  }}
                />
              ))}
            </View>
          ) : (
            <Button
              disabled={isAnswering}
              title="Show answer"
              style={styles.showAnswerButton}
              onPress={() => setIsAnswerVisible(true)}
            />
          )}
        </>
      ) : null}

      {isSessionComplete ? (
        <View style={styles.completeCard}>
          <Ionicons name="checkmark-circle" size={42} color={colors.green} />
          <Text style={styles.completeTitle}>Reviews complete</Text>
          <Text style={styles.completeText}>
            You reviewed {reviewedCount} words: {correctCount} correct and {againCount} marked again.
          </Text>
          <Button title="Check again" style={styles.restartButton} onPress={handleRestart} />
          <Button
            title="Practice flashcards"
            variant="secondary"
            style={styles.completeSecondaryButton}
            onPress={() => router.push("/practice")}
          />
          <Button
            title="Back home"
            variant="secondary"
            style={styles.completeSecondaryButton}
            onPress={() => router.replace("/")}
          />
        </View>
      ) : null}
    </ScreenContainer>
  );
}

type ReviewCardProps = {
  item: DueReviewItem;
  isAnswerVisible: boolean;
};

function ReviewCard({ item, isAnswerVisible }: ReviewCardProps) {
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
          <Text style={styles.hiddenAnswerText}>Reveal the answer before choosing a rating.</Text>
        </View>
      )}
    </View>
  );
}

type RatingButtonProps = {
  disabled: boolean;
  label: string;
  description: string;
  rating: ReviewRating;
  onPress: () => void;
};

function RatingButton({ disabled, label, description, rating, onPress }: RatingButtonProps) {
  const isAgain = rating === "AGAIN";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={[styles.ratingButton, isAgain ? styles.ratingButtonAgain : styles.ratingButtonCorrect]}
      onPress={onPress}
    >
      <Text style={[styles.ratingLabel, isAgain ? styles.ratingLabelAgain : styles.ratingLabelCorrect]}>
        {label}
      </Text>
      <Text
        style={[
          styles.ratingDescription,
          isAgain ? styles.ratingDescriptionAgain : styles.ratingDescriptionCorrect,
        ]}
      >
        {description}
      </Text>
    </Pressable>
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
  showAnswerButton: {
    marginTop: spacing.lg,
  },
  ratingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  ratingButton: {
    width: "47%",
    minHeight: 78,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    padding: spacing.md,
  },
  ratingButtonAgain: {
    borderColor: colors.error,
    backgroundColor: colors.white,
  },
  ratingButtonCorrect: {
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: typography.weights.black,
  },
  ratingLabelAgain: {
    color: colors.error,
  },
  ratingLabelCorrect: {
    color: colors.white,
  },
  ratingDescription: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.medium,
    marginTop: spacing.xs,
  },
  ratingDescriptionAgain: {
    color: colors.textMuted,
  },
  ratingDescriptionCorrect: {
    color: colors.white,
  },
  noticeError: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: typography.weights.medium,
    textAlign: "center",
    marginTop: spacing.md,
  },
  emptyActions: {
    gap: spacing.md,
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
  completeSecondaryButton: {
    alignSelf: "stretch",
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
