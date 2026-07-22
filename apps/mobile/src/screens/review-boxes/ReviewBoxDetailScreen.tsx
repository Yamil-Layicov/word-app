import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { VocabularyItem } from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import { canStartMatchingSession } from "@/features/practice";
import {
  REVIEW_INTERVALS,
  getReviewIntervalByApiInterval,
  isScheduledReviewItemDue,
  useCancelScheduledReview,
  useScheduleUserWord,
  useScheduledReviewBoxDetailQuery,
  useStartScheduledReviewBox,
  type ScheduledReviewInterval,
  type ScheduledReviewItem,
} from "@/features/review-boxes";
import { isApiError } from "@/shared/api/http-error";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";
import { VocabularyWordRow } from "@/screens/vocabulary/VocabularyWordRow";
import { ReviewModePicker } from "./ReviewModePicker";
import { ScheduledWordActionSheet } from "./ScheduledWordActionSheet";

const EMPTY_SCHEDULED_ITEMS: ScheduledReviewItem[] = [];

type ReviewBoxDetailScreenProps = {
  boxId?: string;
};

export function ReviewBoxDetailScreen({ boxId }: ReviewBoxDetailScreenProps) {
  const router = useRouter();
  const intervalId = parseScheduledReviewInterval(boxId);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [selectedScheduledItem, setSelectedScheduledItem] =
    useState<ScheduledReviewItem | null>(null);
  const [isReviewModePickerVisible, setReviewModePickerVisible] =
    useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const boxDetailQuery = useScheduledReviewBoxDetailQuery(intervalId);
  const cancelMutation = useCancelScheduledReview();
  const scheduleMutation = useScheduleUserWord();
  const startMutation = useStartScheduledReviewBox();
  const hasUnauthorizedError = useAuthFailureRedirect(
    boxDetailQuery.error ??
      cancelMutation.error ??
      scheduleMutation.error ??
      startMutation.error,
  );

  const interval = intervalId
    ? getReviewIntervalByApiInterval(intervalId)
    : undefined;
  const scheduledItems = boxDetailQuery.data?.items ?? EMPTY_SCHEDULED_ITEMS;
  const groupedItems = useMemo(
    () => groupScheduledItems(scheduledItems, nowMs),
    [scheduledItems, nowMs],
  );
  const waitingItems = [...groupedItems.started, ...groupedItems.queued];
  const visibleItemCount = scheduledItems.length;
  const isUpdating =
    cancelMutation.isPending ||
    scheduleMutation.isPending ||
    startMutation.isPending;

  useEffect(() => {
    const timerId = setInterval(() => setNowMs(Date.now()), 1_000);

    return () => clearInterval(timerId);
  }, []);

  const moveScheduledWord = async (nextInterval: ScheduledReviewInterval) => {
    if (!selectedScheduledItem) {
      return;
    }

    const item = selectedScheduledItem;
    setNotice(null);

    try {
      await scheduleMutation.mutateAsync({
        userWordId: item.userWordId,
        interval: nextInterval,
      });
      setSelectedScheduledItem(null);
      setNotice(
        `${item.sourceText} moved to ${getIntervalLabel(nextInterval)}.`,
      );
    } catch (error) {
      if (!isApiError(error) || error.status !== 401) {
        setNotice(
          isApiError(error) ? error.message : "Could not move this word.",
        );
      }
    }
  };

  const removeScheduledWord = async () => {
    if (!selectedScheduledItem) {
      return;
    }

    const item = selectedScheduledItem;
    setNotice(null);

    try {
      await cancelMutation.mutateAsync(item.scheduleId);
      setSelectedScheduledItem(null);
      setNotice(`${item.sourceText} removed from the review box.`);
    } catch (error) {
      if (!isApiError(error) || error.status !== 401) {
        setNotice(
          isApiError(error) ? error.message : "Could not remove this word.",
        );
      }
    }
  };

  const title = `${interval?.label ?? "Review"} box`;

  return (
    <ScreenContainer
      backgroundColor={colors.backgroundWarm}
      contentStyle={styles.content}
    >
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
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <Text style={styles.subtitle}>
            {visibleItemCount} {visibleItemCount === 1 ? "word" : "words"}
          </Text>
        </View>

        {interval && groupedItems.due.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.startButton,
              pressed ? styles.pressed : null,
            ]}
            onPress={() => setReviewModePickerVisible(true)}
          >
            <Ionicons name="play" size={15} color={colors.white} />
            <Text style={styles.startButtonText}>Play</Text>
          </Pressable>
        ) : interval && groupedItems.queued.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: startMutation.isPending }}
            disabled={startMutation.isPending}
            style={({ pressed }) => [
              styles.startButton,
              pressed ? styles.pressed : null,
            ]}
            onPress={() => startMutation.mutate(interval.apiInterval)}
          >
            <Ionicons name="play" size={15} color={colors.white} />
            <Text style={styles.startButtonText}>Start</Text>
          </Pressable>
        ) : null}
      </View>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {!interval ? <StateBox title="Review box not found." /> : null}

      {boxDetailQuery.isLoading ? <StateBox title="Loading words..." /> : null}

      {boxDetailQuery.isError && !hasUnauthorizedError ? (
        <StateBox
          title="Could not load words."
          actionTitle="Try again"
          onAction={() => void boxDetailQuery.refetch()}
        />
      ) : null}

      {!boxDetailQuery.isLoading &&
      !boxDetailQuery.isError &&
      interval &&
      visibleItemCount === 0 ? (
        <StateBox title="No words in this box yet." />
      ) : null}

      {groupedItems.due.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ready to review</Text>
          {groupedItems.due.map((item) => (
            <VocabularyWordRow
              key={item.scheduleId}
              concealTranslation
              item={toVocabularyItem(item)}
              onMenuPress={() => setSelectedScheduledItem(item)}
              onPress={() => setSelectedScheduledItem(item)}
            />
          ))}
        </View>
      ) : null}

      {waitingItems.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {groupedItems.due.length > 0 ? "Waiting" : "Words"}
          </Text>
          {waitingItems.map((item) => (
            <VocabularyWordRow
              key={item.scheduleId}
              concealTranslation
              item={toVocabularyItem(item)}
              onMenuPress={() => setSelectedScheduledItem(item)}
              onPress={() => setSelectedScheduledItem(item)}
            />
          ))}
        </View>
      ) : null}

      <ReviewModePicker
        canUseMatching={canStartMatchingSession(groupedItems.due)}
        canUseMultipleChoice={
          new Set(groupedItems.due.map((item) => item.targetText)).size >= 2
        }
        visible={isReviewModePickerVisible}
        wordCount={groupedItems.due.length}
        onClose={() => setReviewModePickerVisible(false)}
        onSelect={(mode) => {
          if (!interval) {
            return;
          }

          setReviewModePickerVisible(false);
          router.push({
            pathname: "/decks/[boxId]/review",
            params: {
              boxId: interval.apiInterval,
              mode,
            },
          });
        }}
      />

      <ScheduledWordActionSheet
        currentInterval={selectedScheduledItem?.interval}
        disabled={isUpdating}
        title={selectedScheduledItem?.sourceText ?? "Scheduled word"}
        visible={Boolean(selectedScheduledItem)}
        onClose={() => setSelectedScheduledItem(null)}
        onMove={(nextInterval) => {
          void moveScheduledWord(nextInterval);
        }}
        onRemove={() => {
          void removeScheduledWord();
        }}
      />
    </ScreenContainer>
  );
}

type ScheduledItemGroups = {
  due: ScheduledReviewItem[];
  queued: ScheduledReviewItem[];
  started: ScheduledReviewItem[];
};

type StateBoxProps = {
  actionTitle?: string;
  onAction?: () => void;
  title: string;
};

function StateBox({ actionTitle, onAction, title }: StateBoxProps) {
  return (
    <View style={styles.stateBox}>
      <Text style={styles.stateTitle}>{title}</Text>
      {actionTitle && onAction ? (
        <Button title={actionTitle} variant="secondary" onPress={onAction} />
      ) : null}
    </View>
  );
}

function groupScheduledItems(
  items: ScheduledReviewItem[],
  nowMs: number,
): ScheduledItemGroups {
  return items.reduce<ScheduledItemGroups>(
    (groups, item) => {
      groups[getScheduledReviewItemStatus(item, nowMs)].push(item);
      return groups;
    },
    { due: [], queued: [], started: [] },
  );
}

function getScheduledReviewItemStatus(
  item: ScheduledReviewItem,
  nowMs: number,
): keyof ScheduledItemGroups {
  if (item.state === "QUEUED") {
    return "queued";
  }

  if (isScheduledReviewItemDue(item, nowMs)) {
    return "due";
  }

  return "started";
}

function toVocabularyItem(item: ScheduledReviewItem): VocabularyItem {
  return {
    id: item.vocabularyItemId,
    languagePairId: "",
    sourceText: item.sourceText,
    targetText: item.targetText,
    wordType: item.wordType,
    cefrLevel: item.cefrLevel,
    definition: item.definition,
    note: item.note,
    visibility: "PRIVATE",
    isActive: true,
    examples: item.examples.map((example) => ({
      ...example,
      createdAt: "",
    })),
    userWord: {
      id: item.userWordId,
      vocabularyItemId: item.vocabularyItemId,
      status: item.status,
      isFavorite: false,
      masteryStep: item.masteryStep,
      reviewCount: item.reviewCount,
      correctCount: item.correctCount,
      wrongCount: item.wrongCount,
      lastReviewedAt: item.lastReviewedAt,
      nextReviewAt: item.nextReviewAt,
      createdAt: "",
    },
    createdAt: "",
  };
}

function getIntervalLabel(interval: ScheduledReviewInterval): string {
  return getReviewIntervalByApiInterval(interval)?.label ?? interval;
}

function parseScheduledReviewInterval(
  value: string | undefined,
): ScheduledReviewInterval | undefined {
  return REVIEW_INTERVALS.find((item) => item.apiInterval === value)
    ?.apiInterval;
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
    marginBottom: spacing.md,
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
  startButton: {
    minHeight: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.orange,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  startButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: typography.weights.black,
  },
  notice: {
    color: colors.green,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typography.weights.bold,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  section: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: typography.weights.black,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
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
  pressed: {
    opacity: 0.72,
  },
});
