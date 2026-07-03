import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useVocabularyItemsQuery, type VocabularyItem } from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import {
  REVIEW_INTERVALS,
  startScheduledBox,
  useReviewBoxesState,
  type ReviewInterval,
  type ReviewIntervalLabel,
  type ScheduledBoxState,
  type ScheduledWord,
} from "@/features/review-boxes";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

type ReviewBoxViewModel = {
  detailLabel: string;
  interval: ReviewInterval;
  kind: "interval";
  state: ScheduledBoxState | undefined;
  status: "empty" | "queued" | "started" | "due";
  wordCount: number;
};

type MasteredBoxViewModel = {
  detailLabel: string;
  kind: "mastered";
  status: "mastered";
  title: string;
  wordCount: number;
};

type ReviewGridBox = ReviewBoxViewModel | MasteredBoxViewModel;

export function ReviewBoxesScreen() {
  const router = useRouter();
  const { scheduledBoxes, scheduledWords } = useReviewBoxesState();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const vocabularyQuery = useVocabularyItemsQuery({ limit: 100 });
  const hasUnauthorizedError = useAuthFailureRedirect(vocabularyQuery.error);
  const boxes = useMemo(
    () =>
      buildReviewGridBoxes(
        REVIEW_INTERVALS,
        scheduledWords,
        scheduledBoxes,
        vocabularyQuery.data?.items ?? [],
        nowMs,
      ),
    [nowMs, scheduledBoxes, scheduledWords, vocabularyQuery.data?.items],
  );

  useEffect(() => {
    const timerId = setInterval(() => setNowMs(Date.now()), 1_000);

    return () => clearInterval(timerId);
  }, []);

  return (
    <ScreenContainer backgroundColor={colors.backgroundWarm} contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Review Boxes</Text>
        <Text style={styles.subtitle}>Start a box when you are ready. Timers do not run before Start.</Text>
      </View>

      {vocabularyQuery.isError && !hasUnauthorizedError ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>Could not load word previews.</Text>
          <Button title="Try again" variant="secondary" onPress={() => void vocabularyQuery.refetch()} />
        </View>
      ) : null}

      <View style={styles.boxList}>
        {boxes.map((box) => (
          <ReviewBoxCard
            key={box.kind === "interval" ? box.interval.label : box.title}
            box={box}
            onOpen={() => {
              router.push({
                pathname: "/decks/[boxId]",
                params: {
                  boxId: box.kind === "interval" ? box.interval.label : "mastered",
                },
              });
            }}
            onStart={() => {
              if (box.kind !== "interval") {
                return;
              }

              startScheduledBox(box.interval);
              setNowMs(Date.now());
            }}
          />
        ))}
      </View>
    </ScreenContainer>
  );
}

type ReviewBoxCardProps = {
  box: ReviewGridBox;
  onOpen: () => void;
  onStart: () => void;
};

function ReviewBoxCard({ box, onOpen, onStart }: ReviewBoxCardProps) {
  const canStart = box.kind === "interval" && box.status === "queued";
  const isDue = box.kind === "interval" && box.status === "due";
  const isRunning = box.kind === "interval" && box.status === "started";
  const isActive = isRunning || isDue;
  const canOpen = box.wordCount > 0;
  const isMastered = box.kind === "mastered";
  const title = box.kind === "interval" ? box.interval.label : box.title;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !canOpen }}
      disabled={!canOpen}
      style={({ pressed }) => [
        styles.boxCard,
        isDue ? styles.boxCardDue : null,
        isMastered ? styles.boxCardMastered : null,
        canOpen && pressed ? styles.cardPressed : null,
      ]}
      onPress={onOpen}
    >
      <View style={styles.boxHeaderRow}>
        <Text numberOfLines={1} style={styles.boxTitle}>{title}</Text>
        <View style={[styles.wordCountBadge, box.wordCount > 0 ? styles.wordCountBadgeFilled : null]}>
          <Text style={[styles.wordCountBadgeText, box.wordCount > 0 ? styles.wordCountBadgeTextFilled : null]}>
            {getBoxCountLabel(box.wordCount)}
          </Text>
        </View>
      </View>

      <View style={styles.boxArtWrap}>
        <BoxIllustration due={isDue} mastered={isMastered} />
      </View>

      {isActive ? (
        <View style={styles.activeBoxPanel}>
          <Text style={[styles.activeCountdown, isDue ? styles.activeCountdownDue : null]}>
            {getActiveCountdownLabel(box)}
          </Text>
          <Text style={styles.activePrompt}>Tap to review words</Text>
          <Text style={styles.activeHint}>
            {isDue ? "This box is ready now." : "The timer keeps running."}
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.boxDetail}>{box.detailLabel}</Text>

          {canStart ? (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.startButton,
                pressed ? styles.pressed : null,
              ]}
              onPress={onStart}
            >
              <Text style={styles.startButtonText}>{getButtonLabel(box.status)}</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

type BoxIllustrationProps = {
  due: boolean;
  mastered: boolean;
};

function BoxIllustration({ due, mastered }: BoxIllustrationProps) {
  return (
    <View style={[styles.boxArt, due ? styles.boxArtDue : null, mastered ? styles.boxArtMastered : null]}>
      <View style={styles.boxLid} />
      <View style={styles.boxBody}>
        <View style={styles.boxStrap} />
        <View style={styles.boxLatch}>
          <Ionicons
            name={mastered ? "checkmark" : due ? "alarm-outline" : "time-outline"}
            size={13}
            color={mastered ? colors.green : due ? colors.orange : colors.navy}
          />
        </View>
      </View>
    </View>
  );
}

function buildReviewGridBoxes(
  intervals: ReviewInterval[],
  scheduledWords: Record<string, ScheduledWord>,
  scheduledBoxes: Partial<Record<ReviewIntervalLabel, ScheduledBoxState>>,
  vocabularyItems: VocabularyItem[],
  nowMs: number,
) {
  const intervalBoxes = intervals.map((interval) => {
    const scheduledIds = Object.entries(scheduledWords)
      .filter(([, scheduledWord]) => scheduledWord.intervalLabel === interval.label)
      .map(([vocabularyItemId]) => vocabularyItemId);
    const state = scheduledBoxes[interval.label];
    const timing = getBoxTiming(state, scheduledIds.length, nowMs);

    return {
      detailLabel: timing.detailLabel,
      interval,
      kind: "interval" as const,
      state,
      status: timing.status,
      wordCount: scheduledIds.length,
    };
  });
  const masteredItems = vocabularyItems.filter((item) => item.userWord.status === "MASTERED");

  return [
    ...intervalBoxes,
    {
      detailLabel: "Words you marked as fully known.",
      kind: "mastered" as const,
      status: "mastered" as const,
      title: "Mastered Words",
      wordCount: masteredItems.length,
    },
  ];
}

function getBoxTiming(
  state: ScheduledBoxState | undefined,
  wordCount: number,
  nowMs: number,
): Pick<ReviewBoxViewModel, "detailLabel" | "status"> {
  if (wordCount === 0) {
    return {
      detailLabel: "Choose words from a deck to fill this box.",
      status: "empty",
    };
  }

  if (!state) {
    return {
      detailLabel: "Timer will start after you press Start.",
      status: "queued",
    };
  }

  const remainingMs = state.dueAt - nowMs;

  if (remainingMs <= 0) {
    return {
      detailLabel: "Ready to review.",
      status: "due",
    };
  }

  return {
    detailLabel: formatRemainingTime(remainingMs),
    status: "started",
  };
}

function formatRemainingTime(valueMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(valueMs / 1_000));
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);

  if (totalHours < 24) {
    return `${padTime(totalHours)}:${padTime(minutes)}:${padTime(seconds)}`;
  }

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return `${days}d ${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}`;
}

function padTime(value: number) {
  return String(value).padStart(2, "0");
}

function getButtonLabel(status: ReviewGridBox["status"]) {
  switch (status) {
    case "queued":
      return "Start";
    case "due":
      return "Due";
    case "started":
      return "Started";
    case "empty":
    case "mastered":
    default:
      return "Start";
  }
}

function getActiveCountdownLabel(box: ReviewGridBox) {
  if (box.status === "due") {
    return "Due now";
  }

  if (box.status === "started") {
    return box.detailLabel.replace(/\.$/, "");
  }

  return box.detailLabel;
}

function getBoxCountLabel(wordCount: number) {
  if (wordCount === 0) {
    return "Empty";
  }

  return `${wordCount} ${wordCount === 1 ? "word" : "words"}`;
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
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.navy,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: typography.weights.black,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: typography.weights.medium,
    marginTop: spacing.xs,
  },
  stateBox: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: typography.weights.bold,
    textAlign: "center",
  },
  boxList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  boxCard: {
    width: "47.8%",
    minHeight: 178,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  boxCardDue: {
    borderColor: "#FFD1B8",
  },
  boxCardMastered: {
    borderColor: "#DCECC3",
  },
  cardPressed: {
    opacity: 0.78,
  },
  boxHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  boxArtWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  boxArt: {
    width: 58,
    height: 52,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  boxArtDue: {},
  boxArtMastered: {},
  boxLid: {
    position: "absolute",
    top: 0,
    width: 48,
    height: 16,
    borderTopLeftRadius: radii.sm,
    borderTopRightRadius: radii.sm,
    borderWidth: 1,
    borderColor: "#D9B17C",
    backgroundColor: "#F4C27A",
    transform: [{ rotate: "-4deg" }],
  },
  boxBody: {
    width: 54,
    height: 38,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: "#D9B17C",
    backgroundColor: "#D98A24",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  boxStrap: {
    position: "absolute",
    width: "100%",
    height: 8,
    backgroundColor: "#FFE1AD",
  },
  boxLatch: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: "#EEF7D8",
    borderWidth: 2,
    borderColor: "#FFE1AD",
    alignItems: "center",
    justifyContent: "center",
  },
  boxTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: typography.weights.black,
  },
  wordCountBadge: {
    minHeight: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  wordCountBadgeFilled: {
    backgroundColor: "#EEF7D8",
    borderColor: "#DCECC3",
  },
  wordCountBadgeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: typography.weights.black,
  },
  wordCountBadgeTextFilled: {
    color: colors.green,
  },
  boxDetail: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.medium,
    marginTop: spacing.xs,
    minHeight: 34,
  },
  activeBoxPanel: {
    flex: 1,
    minHeight: 78,
    borderRadius: radii.lg,
    backgroundColor: "#FFF7EF",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  activeCountdown: {
    color: colors.navy,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: typography.weights.semibold,
    textAlign: "center",
  },
  activeCountdownDue: {
    color: colors.orange,
  },
  activePrompt: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.bold,
    textAlign: "center",
  },
  activeHint: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: typography.weights.medium,
    textAlign: "center",
  },
  startButton: {
    minHeight: 34,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.orange,
    marginTop: "auto",
  },
  startButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: typography.weights.black,
  },
  pressed: {
    opacity: 0.72,
  },
});
