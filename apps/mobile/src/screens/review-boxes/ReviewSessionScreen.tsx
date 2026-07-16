import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuthFailureRedirect } from "@/features/auth";
import {
  REVIEW_INTERVALS,
  getReviewIntervalByApiInterval,
  isScheduledReviewItemDue,
  useAnswerScheduledReview,
  useScheduledReviewBoxDetailQuery,
  type ReviewSessionMode,
  type ScheduledReviewAnswerResult,
  type ScheduledReviewInterval,
  type ScheduledReviewItem,
} from "@/features/review-boxes";
import { isApiError } from "@/shared/api/http-error";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";
import { ReviewDestinationPicker } from "./ReviewDestinationPicker";
import { ReviewSessionPrompt } from "./ReviewSessionPrompt";

type ReviewAnswerResult = Exclude<ScheduledReviewAnswerResult, "KNOWN">;

const REVIEW_SESSION_MODES: ReviewSessionMode[] = [
  "FLASHCARD",
  "TYPING",
  "MULTIPLE_CHOICE",
];

export function ReviewSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    boxId?: string | string[];
    mode?: string | string[];
  }>();
  const interval = parseScheduledReviewInterval(getParamValue(params.boxId));
  const mode = parseReviewSessionMode(getParamValue(params.mode));
  const [sessionItems, setSessionItems] = useState<
    ScheduledReviewItem[] | null
  >(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerResult, setAnswerResult] =
    useState<ReviewAnswerResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const submissionInFlightRef = useRef(false);

  const boxDetailQuery = useScheduledReviewBoxDetailQuery(interval);
  const answerMutation = useAnswerScheduledReview();
  const hasUnauthorizedError = useAuthFailureRedirect(
    boxDetailQuery.error ?? answerMutation.error,
  );

  useEffect(() => {
    if (sessionItems !== null || !boxDetailQuery.data) {
      return;
    }

    const nowMs = Date.now();
    setSessionItems(
      boxDetailQuery.data.items.filter((item) =>
        isScheduledReviewItemDue(item, nowMs),
      ),
    );
  }, [boxDetailQuery.data, sessionItems]);

  const currentItem = sessionItems?.[currentIndex];
  const choiceOptions = useMemo(
    () =>
      currentItem && sessionItems
        ? buildChoiceOptions(sessionItems, currentIndex)
        : [],
    [currentIndex, currentItem, sessionItems],
  );
  const intervalLabel = interval
    ? getReviewIntervalByApiInterval(interval)?.label
    : undefined;
  const isComplete =
    sessionItems !== null &&
    sessionItems.length > 0 &&
    currentIndex >= sessionItems.length;

  const completeReview = async (
    result: ScheduledReviewAnswerResult,
    nextInterval?: ScheduledReviewInterval,
  ) => {
    if (!currentItem || !mode || submissionInFlightRef.current) {
      return;
    }

    submissionInFlightRef.current = true;
    setNotice(null);

    try {
      if (result === "KNOWN") {
        await answerMutation.mutateAsync({
          practiceMode: mode,
          scheduleId: currentItem.scheduleId,
          result,
        });
      } else {
        if (!nextInterval) {
          return;
        }

        await answerMutation.mutateAsync({
          practiceMode: mode,
          scheduleId: currentItem.scheduleId,
          result,
          nextInterval,
        });
      }

      setAnswerResult(null);
      setCurrentIndex((index) => index + 1);
    } catch (error) {
      if (!isApiError(error) || error.status !== 401) {
        setNotice(
          isApiError(error) ? error.message : "Could not save this answer.",
        );
      }
    } finally {
      submissionInFlightRef.current = false;
    }
  };

  const finishSession = () => {
    if (!interval) {
      router.back();
      return;
    }

    router.replace({
      pathname: "/decks/[boxId]",
      params: { boxId: interval },
    });
  };

  return (
    <ScreenContainer
      backgroundColor={colors.backgroundWarm}
      contentStyle={styles.content}
    >
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Leave review"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.iconButton,
            pressed ? styles.pressed : null,
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>

        <View style={styles.headerText}>
          <Text numberOfLines={1} style={styles.title}>
            {intervalLabel ? `${intervalLabel} review` : "Review"}
          </Text>
          <Text style={styles.subtitle}>
            {mode ? getReviewModeLabel(mode) : "Choose a valid mode"}
          </Text>
        </View>

        {sessionItems && sessionItems.length > 0 ? (
          <Text style={styles.counter}>
            {Math.min(currentIndex + 1, sessionItems.length)}/
            {sessionItems.length}
          </Text>
        ) : null}
      </View>

      {sessionItems && sessionItems.length > 0 ? (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(
                  100,
                  (currentIndex / sessionItems.length) * 100,
                )}%`,
              },
            ]}
          />
        </View>
      ) : null}

      {!interval || !mode ? (
        <SessionState
          actionTitle="Go back"
          title="This review session is not valid."
          onAction={() => router.back()}
        />
      ) : null}

      {interval && mode && boxDetailQuery.isLoading ? (
        <SessionState title="Preparing review..." />
      ) : null}

      {interval &&
      mode &&
      boxDetailQuery.isError &&
      !hasUnauthorizedError ? (
        <SessionState
          actionTitle="Try again"
          title="Could not load this review box."
          onAction={() => void boxDetailQuery.refetch()}
        />
      ) : null}

      {interval &&
      mode &&
      !boxDetailQuery.isLoading &&
      !boxDetailQuery.isError &&
      sessionItems?.length === 0 ? (
        <SessionState
          actionTitle="Back to box"
          title="No words are due now."
          onAction={finishSession}
        />
      ) : null}

      {mode === "MULTIPLE_CHOICE" &&
      currentItem &&
      choiceOptions.length < 2 ? (
        <SessionState
          actionTitle="Back to box"
          title="Test mode needs at least 2 different answers."
          onAction={finishSession}
        />
      ) : null}

      {isComplete && sessionItems ? (
        <View style={styles.completeCard}>
          <View style={styles.completeIcon}>
            <Ionicons
              name="checkmark"
              size={30}
              color={colors.green}
            />
          </View>
          <Text style={styles.completeTitle}>Review complete</Text>
          <Text style={styles.completeSubtitle}>
            {sessionItems.length}{" "}
            {sessionItems.length === 1 ? "word was" : "words were"} reviewed.
          </Text>
          <Button title="Done" onPress={finishSession} />
        </View>
      ) : null}

      {currentItem &&
      mode &&
      !(mode === "MULTIPLE_CHOICE" && choiceOptions.length < 2) ? (
        <View style={styles.sessionBody}>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          {answerResult === null ? (
            <ReviewSessionPrompt
              key={currentItem.scheduleId}
              choiceOptions={choiceOptions}
              item={currentItem}
              mode={mode}
              onAnswer={setAnswerResult}
            />
          ) : (
            <ReviewOutcome
              currentInterval={currentItem.interval}
              disabled={answerMutation.isPending}
              item={currentItem}
              result={answerResult}
              onKnown={() => {
                void completeReview("KNOWN");
              }}
              onSelectInterval={(nextInterval) => {
                void completeReview(answerResult, nextInterval);
              }}
            />
          )}
        </View>
      ) : null}
    </ScreenContainer>
  );
}

type ReviewOutcomeProps = {
  currentInterval: ScheduledReviewInterval;
  disabled: boolean;
  item: ScheduledReviewItem;
  onKnown: () => void;
  onSelectInterval: (interval: ScheduledReviewInterval) => void;
  result: ReviewAnswerResult;
};

function ReviewOutcome({
  currentInterval,
  disabled,
  item,
  onKnown,
  onSelectInterval,
  result,
}: ReviewOutcomeProps) {
  const isCorrect = result === "CORRECT";

  return (
    <View style={styles.outcomeCard}>
      <View
        style={[
          styles.outcomeStatus,
          isCorrect ? styles.outcomeSuccess : styles.outcomeDanger,
        ]}
      >
        <Ionicons
          name={isCorrect ? "checkmark-circle" : "close-circle"}
          size={22}
          color={isCorrect ? colors.green : colors.error}
        />
        <Text
          style={[
            styles.outcomeStatusText,
            { color: isCorrect ? colors.green : colors.error },
          ]}
        >
          {isCorrect ? "Correct" : "Keep reviewing"}
        </Text>
      </View>

      <Text style={styles.outcomeSource}>{item.sourceText}</Text>
      <Text style={styles.outcomeTarget}>{item.targetText}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        style={({ pressed }) => [
          styles.knownButton,
          disabled ? styles.disabled : null,
          pressed ? styles.pressed : null,
        ]}
        onPress={onKnown}
      >
        <Ionicons name="ribbon-outline" size={18} color={colors.navy} />
        <Text style={styles.knownButtonText}>I know this</Text>
      </Pressable>

      <View style={styles.destinationHeader}>
        <Text style={styles.destinationTitle}>Choose the next box</Text>
        <Text style={styles.destinationSubtitle}>
          Its timer starts when you press Start.
        </Text>
      </View>

      <ReviewDestinationPicker
        currentInterval={currentInterval}
        disabled={disabled}
        onSelect={onSelectInterval}
      />
    </View>
  );
}

type SessionStateProps = {
  actionTitle?: string;
  onAction?: () => void;
  title: string;
};

function SessionState({ actionTitle, onAction, title }: SessionStateProps) {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>{title}</Text>
      {actionTitle && onAction ? (
        <Button title={actionTitle} variant="secondary" onPress={onAction} />
      ) : null}
    </View>
  );
}

function buildChoiceOptions(
  items: ScheduledReviewItem[],
  currentIndex: number,
) {
  const currentItem = items[currentIndex];

  if (!currentItem) {
    return [];
  }

  const distractors = Array.from(
    new Set(
      items
        .filter((_, index) => index !== currentIndex)
        .map((item) => item.targetText)
        .filter((targetText) => targetText !== currentItem.targetText),
    ),
  ).slice(0, 3);
  const options = [currentItem.targetText, ...distractors];
  const shift = currentIndex % options.length;

  return [...options.slice(shift), ...options.slice(0, shift)];
}

function getReviewModeLabel(mode: ReviewSessionMode) {
  switch (mode) {
    case "FLASHCARD":
      return "Flashcards";
    case "TYPING":
      return "Writing";
    case "MULTIPLE_CHOICE":
      return "Test";
  }
}

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseScheduledReviewInterval(
  value: string | undefined,
): ScheduledReviewInterval | undefined {
  return REVIEW_INTERVALS.find((item) => item.apiInterval === value)
    ?.apiInterval;
}

function parseReviewSessionMode(
  value: string | undefined,
): ReviewSessionMode | undefined {
  return REVIEW_SESSION_MODES.find((mode) => mode === value);
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
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
    fontSize: 18,
    lineHeight: 24,
    fontWeight: typography.weights.black,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: typography.weights.semibold,
    marginTop: 1,
  },
  counter: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: typography.weights.black,
  },
  progressTrack: {
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: "hidden",
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.green,
  },
  sessionBody: {
    gap: spacing.md,
  },
  notice: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typography.weights.bold,
    textAlign: "center",
  },
  outcomeCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.xl,
  },
  outcomeStatus: {
    minHeight: 42,
    borderRadius: radii.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  outcomeSuccess: {
    backgroundColor: "#F4FAE9",
  },
  outcomeDanger: {
    backgroundColor: "#FFF1F1",
  },
  outcomeStatusText: {
    fontSize: 14,
    fontWeight: typography.weights.black,
  },
  outcomeSource: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: typography.weights.semibold,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  outcomeTarget: {
    color: colors.navy,
    fontSize: 27,
    lineHeight: 34,
    fontWeight: typography.weights.black,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  knownButton: {
    minHeight: 46,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  knownButtonText: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: typography.weights.black,
  },
  destinationHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  destinationTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: typography.weights.black,
  },
  destinationSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
  completeCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: "#DCECC3",
    backgroundColor: colors.white,
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  completeIcon: {
    width: 62,
    height: 62,
    borderRadius: radii.pill,
    backgroundColor: "#F4FAE9",
    alignItems: "center",
    justifyContent: "center",
  },
  completeTitle: {
    color: colors.navy,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: typography.weights.black,
  },
  completeSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: typography.weights.medium,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  stateCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
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
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.5,
  },
});
