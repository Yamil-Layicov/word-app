import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "@/shared/theme";

const MATCHING_ROUND_SIZE = 5;
const FEEDBACK_DELAY_MS = 450;

export type MatchingBoardItem = {
  id: string;
  sourceText: string;
  targetText: string;
};

export type MatchingBoardResult = {
  isCorrect: boolean;
  itemId: string;
};

const EMPTY_MATCHING_ITEMS: MatchingBoardItem[] = [];

type MatchingPracticeBoardProps = {
  disabled?: boolean;
  items: MatchingBoardItem[];
  onComplete: () => void;
  onProgressChange?: (completed: number) => void;
  onResolve: (result: MatchingBoardResult) => Promise<void>;
};

type PairFeedback = "correct" | "incorrect" | "save-error" | null;

export function MatchingPracticeBoard({
  disabled = false,
  items,
  onComplete,
  onProgressChange,
  onResolve,
}: MatchingPracticeBoardProps) {
  const rounds = useMemo(() => buildMatchingRounds(items), [items]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [matchedItemIds, setMatchedItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [missedItemIds, setMissedItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<PairFeedback>(null);
  const [isResolving, setResolving] = useState(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionNotifiedRef = useRef(false);

  const roundItems = rounds[roundIndex] ?? EMPTY_MATCHING_ITEMS;
  const targetItems = useMemo(
    () => rotateMatchingTargets(roundItems, roundIndex),
    [roundIndex, roundItems],
  );

  useEffect(
    () => () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    },
    [],
  );

  const clearSelectionAfterDelay = (callback?: () => void) => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }

    feedbackTimerRef.current = setTimeout(() => {
      setSelectedSourceId(null);
      setSelectedTargetId(null);
      setFeedback(null);
      setResolving(false);
      callback?.();
    }, FEEDBACK_DELAY_MS);
  };

  const evaluateSelection = async (sourceId: string, targetId: string) => {
    setResolving(true);

    if (sourceId !== targetId) {
      setMissedItemIds((current) => new Set(current).add(sourceId));
      setFeedback("incorrect");
      clearSelectionAfterDelay();
      return;
    }

    setFeedback("correct");

    try {
      await onResolve({
        itemId: sourceId,
        isCorrect: !missedItemIds.has(sourceId),
      });
    } catch {
      setFeedback("save-error");
      setResolving(false);
      return;
    }

    const nextMatchedItemIds = new Set(matchedItemIds).add(sourceId);
    setMatchedItemIds(nextMatchedItemIds);
    onProgressChange?.(nextMatchedItemIds.size);

    clearSelectionAfterDelay(() => {
      if (nextMatchedItemIds.size === items.length) {
        if (!completionNotifiedRef.current) {
          completionNotifiedRef.current = true;
          onComplete();
        }
        return;
      }

      const isRoundComplete = roundItems.every((item) =>
        nextMatchedItemIds.has(item.id),
      );

      if (isRoundComplete) {
        setRoundIndex((index) => index + 1);
      }
    });
  };

  const selectSource = (itemId: string) => {
    if (disabled || isResolving || matchedItemIds.has(itemId)) {
      return;
    }

    setSelectedSourceId(itemId);
    setFeedback(null);

    if (selectedTargetId) {
      void evaluateSelection(itemId, selectedTargetId);
    }
  };

  const selectTarget = (itemId: string) => {
    if (disabled || isResolving || matchedItemIds.has(itemId)) {
      return;
    }

    setSelectedTargetId(itemId);
    setFeedback(null);

    if (selectedSourceId) {
      void evaluateSelection(selectedSourceId, itemId);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Match the pairs</Text>
          <Text style={styles.subtitle}>
            Choose one word and its translation.
          </Text>
        </View>
        <Text style={styles.roundLabel}>
          Round {Math.min(roundIndex + 1, rounds.length)}/{rounds.length}
        </Text>
      </View>

      <View style={styles.columnLabels}>
        <Text style={styles.columnLabel}>Words</Text>
        <Text style={styles.columnLabel}>Translations</Text>
      </View>

      <View style={styles.board}>
        <View style={styles.column}>
          {roundItems.map((item) => (
            <MatchingTile
              key={item.id}
              disabled={disabled || isResolving}
              feedback={getTileFeedback({
                feedback,
                itemId: item.id,
                selectedId: selectedSourceId,
              })}
              matched={matchedItemIds.has(item.id)}
              text={item.sourceText}
              onPress={() => selectSource(item.id)}
            />
          ))}
        </View>

        <View style={styles.column}>
          {targetItems.map((item) => (
            <MatchingTile
              key={item.id}
              disabled={disabled || isResolving}
              feedback={getTileFeedback({
                feedback,
                itemId: item.id,
                selectedId: selectedTargetId,
              })}
              matched={matchedItemIds.has(item.id)}
              text={item.targetText}
              onPress={() => selectTarget(item.id)}
            />
          ))}
        </View>
      </View>

      {feedback === "incorrect" ? (
        <Text style={styles.incorrectMessage}>Those words do not match.</Text>
      ) : null}
      {feedback === "save-error" ? (
        <Text style={styles.errorMessage}>
          Could not save this pair. Tap it again to retry.
        </Text>
      ) : null}
    </View>
  );
}

type MatchingTileFeedback = "correct" | "incorrect" | "selected" | null;

type MatchingTileProps = {
  disabled: boolean;
  feedback: MatchingTileFeedback;
  matched: boolean;
  onPress: () => void;
  text: string;
};

function MatchingTile({
  disabled,
  feedback,
  matched,
  onPress,
  text,
}: MatchingTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        disabled: disabled || matched,
        selected: Boolean(feedback),
      }}
      disabled={disabled || matched}
      style={({ pressed }) => [
        styles.tile,
        feedback === "selected" ? styles.tileSelected : null,
        feedback === "correct" ? styles.tileCorrect : null,
        feedback === "incorrect" ? styles.tileIncorrect : null,
        matched ? styles.tileMatched : null,
        pressed ? styles.pressed : null,
      ]}
      onPress={onPress}
    >
      <Text
        numberOfLines={3}
        style={[styles.tileText, matched ? styles.tileTextMatched : null]}
      >
        {text}
      </Text>
      {matched ? (
        <Ionicons name="checkmark-circle" size={17} color={colors.green} />
      ) : null}
    </Pressable>
  );
}

type TileFeedbackInput = {
  feedback: PairFeedback;
  itemId: string;
  selectedId: string | null;
};

function getTileFeedback({
  feedback,
  itemId,
  selectedId,
}: TileFeedbackInput): MatchingTileFeedback {
  if (itemId !== selectedId) {
    return null;
  }

  if (feedback === "correct") {
    return "correct";
  }

  if (feedback === "incorrect") {
    return "incorrect";
  }

  return "selected";
}

function buildMatchingRounds(items: MatchingBoardItem[]) {
  const rounds: MatchingBoardItem[][] = [];

  for (let index = 0; index < items.length; ) {
    const remainingCount = items.length - index;
    let roundSize = Math.min(MATCHING_ROUND_SIZE, remainingCount);

    if (remainingCount - roundSize === 1) {
      roundSize -= 1;
    }

    rounds.push(items.slice(index, index + roundSize));
    index += roundSize;
  }

  return rounds;
}

function rotateMatchingTargets(items: MatchingBoardItem[], roundIndex: number) {
  if (items.length < 2) {
    return items;
  }

  const shift = (roundIndex % (items.length - 1)) + 1;

  return [...items.slice(shift), ...items.slice(0, shift)];
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.navy,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: typography.weights.black,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
  roundLabel: {
    color: colors.orange,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: typography.weights.black,
  },
  columnLabels: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  columnLabel: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: typography.weights.black,
    textTransform: "uppercase",
    textAlign: "center",
  },
  board: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  column: {
    flex: 1,
    gap: spacing.sm,
  },
  tile: {
    minHeight: 66,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  tileSelected: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeSoft,
  },
  tileCorrect: {
    borderColor: colors.green,
    backgroundColor: "#F4FAE9",
  },
  tileIncorrect: {
    borderColor: colors.error,
    backgroundColor: "#FFF1F1",
  },
  tileMatched: {
    borderColor: "#DCECC3",
    backgroundColor: "#F4FAE9",
  },
  tileText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typography.weights.bold,
    textAlign: "center",
  },
  tileTextMatched: {
    color: colors.green,
  },
  incorrectMessage: {
    color: colors.error,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: typography.weights.bold,
    textAlign: "center",
    marginTop: spacing.md,
  },
  errorMessage: {
    color: colors.error,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: typography.weights.bold,
    textAlign: "center",
    marginTop: spacing.md,
  },
  pressed: {
    opacity: 0.72,
  },
});
