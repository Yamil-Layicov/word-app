import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { type VocabularyItem, useVocabularyItemsQuery } from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import {
  REVIEW_INTERVALS,
  getReviewIntervalByApiInterval,
  useAnswerScheduledReview,
  useScheduledReviewBoxDetailQuery,
  useStartScheduledReviewBox,
  type ScheduledReviewAnswerQuality,
  type ScheduledReviewInterval,
  type ScheduledReviewItem,
} from "@/features/review-boxes";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";
import { VocabularyWordRow } from "@/screens/vocabulary/VocabularyWordRow";

const EMPTY_SCHEDULED_ITEMS: ScheduledReviewItem[] = [];

export function ReviewBoxDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ boxId?: string | string[] }>();
  const boxId = getParamValue(params.boxId);
  const intervalId = parseScheduledReviewInterval(boxId);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const boxDetailQuery = useScheduledReviewBoxDetailQuery(intervalId);
  const answerScheduledReviewMutation = useAnswerScheduledReview();
  const startScheduledReviewBoxMutation = useStartScheduledReviewBox();
  const vocabularyQuery = useVocabularyItemsQuery({ limit: 100 });
  const hasUnauthorizedError = useAuthFailureRedirect(
    vocabularyQuery.error ??
      boxDetailQuery.error ??
      answerScheduledReviewMutation.error ??
      startScheduledReviewBoxMutation.error,
  );
  const interval = intervalId ? getReviewIntervalByApiInterval(intervalId) : undefined;
  const isMasteredBox = boxId === "mastered";
  const vocabularyItems = vocabularyQuery.data?.items ?? [];
  const masteredItems = vocabularyItems.filter((item) => item.userWord.status === "MASTERED");
  const scheduledItems = boxDetailQuery.data?.items ?? EMPTY_SCHEDULED_ITEMS;
  const visibleItemCount = isMasteredBox ? masteredItems.length : scheduledItems.length;
  const groupedItems = useMemo(
    () => (isMasteredBox ? emptyScheduledItemGroups() : groupScheduledItems(scheduledItems, nowMs)),
    [isMasteredBox, scheduledItems, nowMs],
  );
  const boxSummary = useMemo(
    () => getBoxSummary(groupedItems, nowMs),
    [groupedItems, nowMs],
  );
  const title = isMasteredBox ? "Mastered Words" : `${interval?.label ?? "Review"} box`;
  const subtitle = isMasteredBox
    ? "Words you marked as fully known."
    : "Each word keeps its own timer.";

  useEffect(() => {
    const timerId = setInterval(() => setNowMs(Date.now()), 1_000);

    return () => clearInterval(timerId);
  }, []);

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

      {interval ? (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryTitle}>{getSummaryTitle(groupedItems)}</Text>
              <Text style={styles.summarySubtitle}>{boxSummary}</Text>
            </View>
            {groupedItems.queued.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                disabled={startScheduledReviewBoxMutation.isPending}
                style={({ pressed }) => [styles.summaryStartButton, pressed ? styles.pressed : null]}
                onPress={() => startScheduledReviewBoxMutation.mutate(interval.apiInterval)}
              >
                <Text style={styles.summaryStartButtonText}>Start queued</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.summaryStats}>
            <SummaryPill label="Due" value={groupedItems.due.length} tone="orange" />
            <SummaryPill label="Active" value={groupedItems.started.length} />
            <SummaryPill label="Queued" value={groupedItems.queued.length} />
          </View>
        </View>
      ) : null}

      {(isMasteredBox ? vocabularyQuery.isLoading : boxDetailQuery.isLoading) ? (
        <StateBox title="Loading words..." />
      ) : null}

      {((isMasteredBox && vocabularyQuery.isError) || (!isMasteredBox && boxDetailQuery.isError)) &&
      !hasUnauthorizedError ? (
        <StateBox
          title="Could not load words."
          actionTitle="Try again"
          onAction={() => {
            if (isMasteredBox) {
              void vocabularyQuery.refetch();
            } else {
              void boxDetailQuery.refetch();
            }
          }}
        />
      ) : null}

      {!(isMasteredBox ? vocabularyQuery.isLoading : boxDetailQuery.isLoading) &&
      !(isMasteredBox ? vocabularyQuery.isError : boxDetailQuery.isError) &&
      (interval || isMasteredBox) &&
      visibleItemCount === 0 ? (
        <StateBox title="No words in this box yet." />
      ) : null}

      {isMasteredBox ? (
        masteredItems.map((item) => (
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
        ))
      ) : (
        <>
          <ScheduledSection
            emptyTitle="No due words yet."
            items={groupedItems.due}
            nowMs={nowMs}
            title="Due now"
            answerPending={answerScheduledReviewMutation.isPending}
            onAnswer={(scheduleId, quality) =>
              answerScheduledReviewMutation.mutate({ scheduleId, quality })
            }
            onOpenWord={(id) =>
              router.push({
                pathname: "/vocabulary/[id]",
                params: { id },
              })
            }
          />
          <ScheduledSection
            emptyTitle="No active timers."
            items={groupedItems.started}
            nowMs={nowMs}
            title="Counting down"
            onOpenWord={(id) =>
              router.push({
                pathname: "/vocabulary/[id]",
                params: { id },
              })
            }
          />
          <ScheduledSection
            emptyTitle="No queued words."
            items={groupedItems.queued}
            nowMs={nowMs}
            title="Queued"
            onOpenWord={(id) =>
              router.push({
                pathname: "/vocabulary/[id]",
                params: { id },
              })
            }
          />
        </>
      )}
    </ScreenContainer>
  );
}

type GroupedScheduledItem = {
  item: ScheduledReviewItem;
};

type ScheduledItemGroups = {
  due: GroupedScheduledItem[];
  queued: GroupedScheduledItem[];
  started: GroupedScheduledItem[];
};

type ScheduledSectionProps = {
  answerPending?: boolean;
  emptyTitle: string;
  items: GroupedScheduledItem[];
  nowMs: number;
  onAnswer?: (scheduleId: string, quality: ScheduledReviewAnswerQuality) => void;
  onOpenWord: (id: string) => void;
  title: string;
};

function ScheduledSection({
  answerPending = false,
  emptyTitle,
  items,
  nowMs,
  onAnswer,
  onOpenWord,
  title,
}: ScheduledSectionProps) {
  const [visibleAnswers, setVisibleAnswers] = useState<Record<string, boolean>>({});

  if (items.length === 0) {
    return (
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionEmptyText}>{emptyTitle}</Text>
      </View>
    );
  }

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map(({ item }) => (
        <View key={item.scheduleId} style={styles.scheduledWordBlock}>
          <View style={styles.wordStatusRow}>
            <Text style={styles.wordStatusText}>{getWordStatusLabel(item, nowMs)}</Text>
          </View>
          {onAnswer ? (
            <ReviewPromptCard
              answerPending={answerPending}
              answerVisible={Boolean(visibleAnswers[item.scheduleId])}
              item={item}
              onAnswer={(quality) => {
                setVisibleAnswers((current) => {
                  const next = { ...current };
                  delete next[item.scheduleId];

                  return next;
                });
                onAnswer(item.scheduleId, quality);
              }}
              onOpenWord={() => onOpenWord(item.vocabularyItemId)}
              onShowAnswer={() =>
                setVisibleAnswers((current) => ({
                  ...current,
                  [item.scheduleId]: true,
                }))
              }
            />
          ) : (
            <VocabularyWordRow
              item={toVocabularyItem(item)}
              onPress={() => onOpenWord(item.vocabularyItemId)}
            />
          )}
        </View>
      ))}
    </View>
  );
}

type ReviewPromptCardProps = {
  answerPending: boolean;
  answerVisible: boolean;
  item: ScheduledReviewItem;
  onAnswer: (quality: ScheduledReviewAnswerQuality) => void;
  onOpenWord: () => void;
  onShowAnswer: () => void;
};

function ReviewPromptCard({
  answerPending,
  answerVisible,
  item,
  onAnswer,
  onOpenWord,
  onShowAnswer,
}: ReviewPromptCardProps) {
  return (
    <View style={styles.reviewPromptCard}>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.reviewPromptMain, pressed ? styles.pressed : null]}
        onPress={onOpenWord}
      >
        <View style={styles.reviewPromptColumn}>
          <Text style={styles.reviewPromptLabel}>Question</Text>
          <Text numberOfLines={2} style={styles.reviewSourceText}>
            {item.sourceText}
          </Text>
        </View>

        <View style={styles.reviewDivider} />

        <View style={styles.reviewPromptColumn}>
          <Text style={styles.reviewPromptLabel}>Answer</Text>
          {answerVisible ? (
            <Text numberOfLines={2} style={styles.reviewTargetText}>
              {item.targetText}
            </Text>
          ) : (
            <View style={styles.hiddenAnswerBox}>
              <Ionicons name="eye-off-outline" size={16} color={colors.textMuted} />
              <Text style={styles.hiddenAnswerText}>Hidden</Text>
            </View>
          )}
        </View>
      </Pressable>

      {answerVisible ? (
        <ReviewAnswerBar disabled={answerPending} onAnswer={onAnswer} />
      ) : (
        <View style={styles.showAnswerBar}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.showAnswerButton, pressed ? styles.pressed : null]}
            onPress={onShowAnswer}
          >
            <Text style={styles.showAnswerButtonText}>Show answer</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

type ReviewAnswerBarProps = {
  disabled: boolean;
  onAnswer: (quality: ScheduledReviewAnswerQuality) => void;
};

function ReviewAnswerBar({ disabled, onAnswer }: ReviewAnswerBarProps) {
  return (
    <View style={styles.answerBar}>
      <AnswerButton disabled={disabled} label="Again" tone="danger" onPress={() => onAnswer("AGAIN")} />
      <AnswerButton disabled={disabled} label="Hard" onPress={() => onAnswer("HARD")} />
      <AnswerButton disabled={disabled} label="Good" tone="green" onPress={() => onAnswer("GOOD")} />
      <AnswerButton disabled={disabled} label="Easy" tone="green" onPress={() => onAnswer("EASY")} />
      <AnswerButton disabled={disabled} label="I know" tone="navy" onPress={() => onAnswer("KNOWN")} />
    </View>
  );
}

type AnswerButtonProps = {
  disabled: boolean;
  label: string;
  onPress: () => void;
  tone?: "danger" | "green" | "navy";
};

function AnswerButton({ disabled, label, onPress, tone = "navy" }: AnswerButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.answerButton,
        tone === "danger" ? styles.answerButtonDanger : null,
        tone === "green" ? styles.answerButtonGreen : null,
        pressed ? styles.pressed : null,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.answerButtonText,
          tone === "danger" ? styles.answerButtonDangerText : null,
          tone === "green" ? styles.answerButtonGreenText : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type SummaryPillProps = {
  label: string;
  tone?: "orange";
  value: number;
};

function SummaryPill({ label, tone, value }: SummaryPillProps) {
  return (
    <View style={[styles.summaryPill, tone === "orange" ? styles.summaryPillOrange : null]}>
      <Text style={[styles.summaryPillValue, tone === "orange" ? styles.summaryPillValueOrange : null]}>
        {value}
      </Text>
      <Text style={styles.summaryPillLabel}>{label}</Text>
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

function emptyScheduledItemGroups(): ScheduledItemGroups {
  return { due: [], queued: [], started: [] };
}

function groupScheduledItems(items: ScheduledReviewItem[], nowMs: number): ScheduledItemGroups {
  return items.reduce<ScheduledItemGroups>(
    (groups, item) => {
      const status = getScheduledReviewItemStatus(item, nowMs);
      groups[status].push({ item });

      return groups;
    },
    emptyScheduledItemGroups(),
  );
}

function getSummaryTitle(groups: ScheduledItemGroups) {
  if (groups.due.length > 0) {
    return `${groups.due.length} ${groups.due.length === 1 ? "word" : "words"} ready`;
  }

  if (groups.started.length > 0) {
    return "Timer is running";
  }

  if (groups.queued.length > 0) {
    return `${groups.queued.length} queued`;
  }

  return "Empty box";
}

function getBoxSummary(groups: ScheduledItemGroups, nowMs: number) {
  if (groups.due.length > 0) {
    return "Review these words, then choose Again, Hard, Good, Easy, or I know.";
  }

  const nextDueAt = groups.started.reduce<number | null>((currentMin, { item }) => {
    const dueAt = item.dueAt ? Date.parse(item.dueAt) : null;

    if (!dueAt) {
      return currentMin;
    }

    return currentMin === null ? dueAt : Math.min(currentMin, dueAt);
  }, null);

  if (nextDueAt) {
    return `Next word due in ${formatRemainingTime(nextDueAt - nowMs)}.`;
  }

  if (groups.queued.length > 0) {
    return "Start queued words when you are ready.";
  }

  return "Add words from a deck to fill this box.";
}

function getWordStatusLabel(item: ScheduledReviewItem, nowMs: number) {
  const status = getScheduledReviewItemStatus(item, nowMs);

  if (status === "queued") {
    return "Queued - timer has not started";
  }

  if (status === "due") {
    return "Due now - review and choose result";
  }

  return item.dueAt
    ? `Due in ${formatRemainingTime(Date.parse(item.dueAt) - nowMs)}`
    : "Timer is running";
}

function getScheduledReviewItemStatus(
  item: ScheduledReviewItem,
  nowMs: number,
): "due" | "queued" | "started" {
  if (item.state === "QUEUED") {
    return "queued";
  }

  if (item.state === "DUE") {
    return "due";
  }

  if (item.dueAt && Date.parse(item.dueAt) <= nowMs) {
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

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseScheduledReviewInterval(value: string | undefined): ScheduledReviewInterval | undefined {
  const interval = REVIEW_INTERVALS.find((item) => item.apiInterval === value);

  return interval?.apiInterval;
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
  summaryCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  summaryTitle: {
    color: colors.navy,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: typography.weights.black,
  },
  summarySubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.medium,
    marginTop: spacing.xs,
    maxWidth: 240,
  },
  summaryStartButton: {
    minHeight: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  summaryStartButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: typography.weights.black,
  },
  summaryStats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  summaryPill: {
    flex: 1,
    minHeight: 50,
    borderRadius: radii.md,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryPillOrange: {
    backgroundColor: colors.orangeSoft,
    borderColor: "#FFD1B8",
  },
  summaryPillValue: {
    color: colors.navy,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: typography.weights.black,
  },
  summaryPillValueOrange: {
    color: colors.orange,
  },
  summaryPillLabel: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: typography.weights.bold,
  },
  sectionBlock: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: typography.weights.black,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionEmptyText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typography.weights.medium,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  scheduledWordBlock: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: "#F0E8DE",
  },
  wordStatusRow: {
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    backgroundColor: "#FFFDF9",
  },
  wordStatusText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: typography.weights.bold,
  },
  reviewPromptCard: {
    backgroundColor: colors.white,
  },
  reviewPromptMain: {
    minHeight: 96,
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  reviewPromptColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  reviewPromptLabel: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: typography.weights.black,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  reviewSourceText: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: typography.weights.semibold,
  },
  reviewTargetText: {
    color: colors.green,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: typography.weights.semibold,
  },
  reviewDivider: {
    width: 1,
    backgroundColor: "#F0E8DE",
  },
  hiddenAnswerBox: {
    minHeight: 38,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  hiddenAnswerText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: typography.weights.bold,
  },
  showAnswerBar: {
    borderTopWidth: 1,
    borderTopColor: "#F0E8DE",
    backgroundColor: colors.backgroundSoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  showAnswerButton: {
    minHeight: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  showAnswerButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: typography.weights.black,
  },
  answerBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#F0E8DE",
    backgroundColor: colors.backgroundSoft,
  },
  answerButton: {
    minHeight: 34,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  answerButtonDanger: {
    borderColor: "#F0B8B0",
    backgroundColor: "#FFF1F1",
  },
  answerButtonGreen: {
    borderColor: "#DCECC3",
    backgroundColor: "#F4FAE9",
  },
  answerButtonText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: typography.weights.black,
  },
  answerButtonDangerText: {
    color: "#C93439",
  },
  answerButtonGreenText: {
    color: colors.green,
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
