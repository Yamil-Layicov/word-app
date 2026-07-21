import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  type MasteredCollectionWord,
  useMasteredCollectionQuery,
} from "@/entities/mastered-collection";
import { useAuthFailureRedirect } from "@/features/auth";
import {
  buildPracticeChoiceOptions,
  getPracticeSessionModeLabel,
  parsePracticeSessionMode,
  useAnswerPractice,
} from "@/features/practice";
import {
  useScheduleUserWord,
  type ScheduledReviewInterval,
} from "@/features/review-boxes";
import { ReviewDestinationPicker } from "@/screens/review-boxes/ReviewDestinationPicker";
import {
  ReviewSessionPrompt,
  type PracticeAnswerResult,
} from "@/screens/review-boxes/ReviewSessionPrompt";
import { isApiError } from "@/shared/api/http-error";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

export function CollectionPracticeSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    collectionId?: string | string[];
    mode?: string | string[];
  }>();
  const collectionId = getParamValue(params.collectionId) ?? "";
  const mode = parsePracticeSessionMode(getParamValue(params.mode));
  const collectionQuery = useMasteredCollectionQuery(collectionId);
  const answerMutation = useAnswerPractice();
  const scheduleMutation = useScheduleUserWord();
  const [sessionItems, setSessionItems] = useState<
    MasteredCollectionWord[] | null
  >(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answerResult, setAnswerResult] = useState<PracticeAnswerResult | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const submissionInFlightRef = useRef(false);
  const hasUnauthorizedError = useAuthFailureRedirect(
    collectionQuery.error ?? answerMutation.error ?? scheduleMutation.error,
  );

  useEffect(() => {
    if (sessionItems !== null || !collectionQuery.data) {
      return;
    }

    setSessionItems(collectionQuery.data.items);
  }, [collectionQuery.data, sessionItems]);

  const currentItem = sessionItems?.[currentIndex];
  const choiceOptions = useMemo(
    () =>
      currentItem && sessionItems
        ? buildPracticeChoiceOptions(sessionItems, currentIndex)
        : [],
    [currentIndex, currentItem, sessionItems],
  );
  const isComplete =
    sessionItems !== null &&
    sessionItems.length > 0 &&
    currentIndex >= sessionItems.length;

  const recordAnswer = async (result: PracticeAnswerResult) => {
    if (!currentItem || !mode || submissionInFlightRef.current) {
      return;
    }

    submissionInFlightRef.current = true;
    setNotice(null);

    try {
      await answerMutation.mutateAsync({
        userWordId: currentItem.userWord.id,
        isCorrect: result === "CORRECT",
        practiceMode: mode,
      });

      if (result === "CORRECT") {
        setCorrectCount((count) => count + 1);
      }

      setAnswerResult(result);
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

  const moveCurrentWordToReviewBox = async (
    interval: ScheduledReviewInterval,
  ) => {
    if (!currentItem || submissionInFlightRef.current) {
      return;
    }

    submissionInFlightRef.current = true;
    setNotice(null);

    try {
      await scheduleMutation.mutateAsync({
        userWordId: currentItem.userWord.id,
        interval,
      });
      advanceToNextWord();
    } catch (error) {
      if (!isApiError(error) || error.status !== 401) {
        setNotice(
          isApiError(error)
            ? error.message
            : "Could not add this word to the review box.",
        );
      }
    } finally {
      submissionInFlightRef.current = false;
    }
  };

  const advanceToNextWord = () => {
    setAnswerResult(null);
    setNotice(null);
    setCurrentIndex((index) => index + 1);
  };

  const finishSession = () => {
    if (!collectionId) {
      router.back();
      return;
    }

    router.replace({
      pathname: "/decks/collections/[collectionId]",
      params: { collectionId },
    });
  };

  return (
    <ScreenContainer
      backgroundColor={colors.backgroundWarm}
      contentStyle={styles.content}
    >
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Leave practice"
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
            {collectionQuery.data?.title ?? "Collection practice"}
          </Text>
          <Text style={styles.subtitle}>
            {mode ? getPracticeSessionModeLabel(mode) : "Choose a valid mode"}
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

      {!collectionId || !mode ? (
        <SessionState
          actionTitle="Go back"
          title="This practice session is not valid."
          onAction={() => router.back()}
        />
      ) : null}

      {collectionId && mode && collectionQuery.isLoading ? (
        <SessionState title="Preparing practice..." />
      ) : null}

      {collectionId &&
      mode &&
      collectionQuery.isError &&
      !hasUnauthorizedError ? (
        <SessionState
          actionTitle="Try again"
          title="Could not load this collection."
          onAction={() => void collectionQuery.refetch()}
        />
      ) : null}

      {collectionId &&
      mode &&
      !collectionQuery.isLoading &&
      !collectionQuery.isError &&
      sessionItems?.length === 0 ? (
        <SessionState
          actionTitle="Back to collection"
          title="This collection has no words to practice."
          onAction={finishSession}
        />
      ) : null}

      {mode === "MULTIPLE_CHOICE" && currentItem && choiceOptions.length < 2 ? (
        <SessionState
          actionTitle="Back to collection"
          title="Test mode needs at least 2 different answers."
          onAction={finishSession}
        />
      ) : null}

      {isComplete && sessionItems ? (
        <View style={styles.completeCard}>
          <View style={styles.completeIcon}>
            <Ionicons name="checkmark" size={30} color={colors.green} />
          </View>
          <Text style={styles.completeTitle}>Practice complete</Text>
          <Text style={styles.completeScore}>
            {correctCount}/{sessionItems.length} correct
          </Text>
          <Text style={styles.completeSubtitle}>
            Practice answers were saved without changing word mastery.
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
              key={currentItem.collectionWordId}
              choiceOptions={choiceOptions}
              item={currentItem}
              mode={mode}
              onAnswer={(result) => {
                void recordAnswer(result);
              }}
            />
          ) : (
            <PracticeOutcome
              disabled={scheduleMutation.isPending}
              item={currentItem}
              result={answerResult}
              onContinue={advanceToNextWord}
              onSelectInterval={(interval) => {
                void moveCurrentWordToReviewBox(interval);
              }}
            />
          )}
        </View>
      ) : null}
    </ScreenContainer>
  );
}

type PracticeOutcomeProps = {
  disabled: boolean;
  item: MasteredCollectionWord;
  onContinue: () => void;
  onSelectInterval: (interval: ScheduledReviewInterval) => void;
  result: PracticeAnswerResult;
};

function PracticeOutcome({
  disabled,
  item,
  onContinue,
  onSelectInterval,
  result,
}: PracticeOutcomeProps) {
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

      <Button disabled={disabled} title="Continue" onPress={onContinue} />

      <View style={styles.destinationHeader}>
        <Text style={styles.destinationTitle}>Review this word later</Text>
        <Text style={styles.destinationSubtitle}>
          Optional. The selected box timer starts when you press Start.
        </Text>
      </View>

      <ReviewDestinationPicker
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

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
    fontSize: 19,
    lineHeight: 25,
    fontWeight: typography.weights.black,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.semibold,
    marginTop: 1,
  },
  counter: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: typography.weights.black,
  },
  progressTrack: {
    height: 6,
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
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.bold,
    textAlign: "center",
  },
  stateCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.xl,
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
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
    fontSize: 13,
    fontWeight: typography.weights.black,
  },
  outcomeSource: {
    color: colors.navy,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: typography.weights.black,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  outcomeTarget: {
    color: colors.green,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: typography.weights.bold,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  destinationHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  destinationTitle: {
    color: colors.navy,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: typography.weights.black,
  },
  destinationSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
  completeCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  completeIcon: {
    width: 58,
    height: 58,
    borderRadius: radii.pill,
    backgroundColor: "#F4FAE9",
    alignItems: "center",
    justifyContent: "center",
  },
  completeTitle: {
    color: colors.navy,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: typography.weights.black,
  },
  completeScore: {
    color: colors.green,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: typography.weights.black,
  },
  completeSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: typography.weights.medium,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.72,
  },
});
