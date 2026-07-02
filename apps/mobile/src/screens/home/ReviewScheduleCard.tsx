import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { type ReviewTimelineGroup, useReviewTimelineQuery } from "@/entities/review";
import { useAuthFailureRedirect } from "@/features/auth";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

const HOME_REVIEW_TIMELINE_DAYS = 7;

export function ReviewScheduleCard() {
  const reviewTimeZone = useMemo(getLocalTimeZone, []);
  const reviewTimelineFilters = useMemo(
    () => ({
      days: HOME_REVIEW_TIMELINE_DAYS,
      timeZone: reviewTimeZone,
    }),
    [reviewTimeZone],
  );
  const reviewTimelineQuery = useReviewTimelineQuery(reviewTimelineFilters);
  const reviewTimelineSummary = useMemo(
    () => getReviewTimelineSummary(reviewTimelineQuery.data?.groups ?? [], reviewTimeZone),
    [reviewTimeZone, reviewTimelineQuery.data?.groups],
  );
  const hasUnauthorizedError = useAuthFailureRedirect(reviewTimelineQuery.error);

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewCardHeader}>
        <Text style={styles.reviewCardTitle}>Review schedule</Text>
        <Text style={styles.reviewCardMeta}>
          {reviewTimelineQuery.isLoading ? "Loading..." : `${HOME_REVIEW_TIMELINE_DAYS} days`}
        </Text>
      </View>
      {reviewTimelineQuery.isError && !hasUnauthorizedError ? (
        <View style={styles.reviewError}>
          <Text style={styles.errorText}>Could not load review schedule.</Text>
          <Button title="Try again" variant="secondary" onPress={() => void reviewTimelineQuery.refetch()} />
        </View>
      ) : (
        <>
          <View style={styles.reviewStatsRow}>
            <ReviewStat label="Due today" value={reviewTimelineSummary.dueToday} />
            <ReviewStat label="Scheduled" value={reviewTimelineSummary.scheduledWords} />
          </View>
          <View style={styles.timelineList}>
            {reviewTimelineSummary.upcomingGroups.length > 0 ? (
              reviewTimelineSummary.upcomingGroups.map((group) => (
                <TimelineRow key={group.date} group={group} />
              ))
            ) : (
              <Text style={styles.emptyTimelineText}>No upcoming reviews in the next 7 days.</Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}

type ReviewStatProps = {
  label: string;
  value: number;
};

function ReviewStat({ label, value }: ReviewStatProps) {
  return (
    <View style={styles.reviewStatBox}>
      <Text style={styles.reviewStatValue}>{value}</Text>
      <Text style={styles.reviewStatLabel}>{label}</Text>
    </View>
  );
}

type TimelineDisplayGroup = {
  date: string;
  label: string;
  totalWordsLabel: string;
  dueWordsLabel: string | null;
};

type TimelineRowProps = {
  group: TimelineDisplayGroup;
};

function TimelineRow({ group }: TimelineRowProps) {
  return (
    <View style={styles.timelineRow}>
      <Text style={styles.timelineDate}>{group.label}</Text>
      <View style={styles.timelineMeta}>
        <Text style={styles.timelineTotal}>{group.totalWordsLabel}</Text>
        {group.dueWordsLabel ? <Text style={styles.timelineDue}>{group.dueWordsLabel}</Text> : null}
      </View>
    </View>
  );
}

function getLocalTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function getReviewTimelineSummary(groups: ReviewTimelineGroup[], timeZone: string) {
  const todayDateKey = toDateKey(new Date(), timeZone);
  const todayGroup = groups.find((group) => group.date === todayDateKey);
  const scheduledWords = groups.reduce((total, group) => total + group.totalWords, 0);
  const upcomingGroups = groups
    .filter((group) => group.date >= todayDateKey && group.totalWords > 0)
    .slice(0, 3)
    .map((group) => ({
      date: group.date,
      label: group.date === todayDateKey ? "Today" : formatTimelineDate(group.date),
      totalWordsLabel: formatWordCount(group.totalWords),
      dueWordsLabel: group.dueWords > 0 ? `${formatWordCount(group.dueWords)} due` : null,
    }));

  return {
    dueToday: todayGroup?.dueWords ?? 0,
    scheduledWords,
    upcomingGroups,
  };
}

function toDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function formatTimelineDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatWordCount(value: number) {
  return `${value} word${value === 1 ? "" : "s"}`;
}

const styles = StyleSheet.create({
  reviewCard: {
    width: "100%",
    maxWidth: 360,
    marginTop: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    padding: spacing.lg,
  },
  reviewCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  reviewCardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: typography.weights.black,
  },
  reviewCardMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: typography.weights.semibold,
  },
  reviewStatsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  reviewStatBox: {
    flex: 1,
    minHeight: 62,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  reviewStatValue: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: typography.weights.black,
  },
  reviewStatLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
  },
  timelineList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  timelineRow: {
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  timelineDate: {
    color: colors.text,
    fontSize: 13,
    fontWeight: typography.weights.black,
  },
  timelineMeta: {
    flexShrink: 1,
    alignItems: "flex-end",
  },
  timelineTotal: {
    color: colors.green,
    fontSize: 13,
    fontWeight: typography.weights.bold,
  },
  timelineDue: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
  emptyTimelineText: {
    color: colors.green,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: typography.weights.medium,
    textAlign: "center",
  },
  reviewError: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: typography.weights.medium,
    textAlign: "center",
  },
});
