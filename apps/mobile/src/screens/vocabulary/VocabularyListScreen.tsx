import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { type VocabularyItem, useInfiniteVocabularyItemsQuery } from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import {
  REVIEW_INTERVALS,
  removeScheduledVocabularyItem,
  scheduleVocabularyItem,
  useReviewBoxesState,
  type ReviewIntervalLabel,
} from "@/features/review-boxes";
import { useUpdateVocabularyItem } from "@/features/vocabulary";
import { isApiError } from "@/shared/api/http-error";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

import { VocabularyWordRow } from "./VocabularyWordRow";

export function VocabularyListScreen() {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<VocabularyItem | null>(null);
  const { scheduledWords } = useReviewBoxesState();
  const [notice, setNotice] = useState<string | null>(null);
  const updateVocabularyItemMutation = useUpdateVocabularyItem();
  const vocabularyQuery = useInfiniteVocabularyItemsQuery({ limit: 20 });
  const hasUnauthorizedError = useAuthFailureRedirect(
    vocabularyQuery.error ?? updateVocabularyItemMutation.error,
  );
  const items = vocabularyQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const handleScheduleWord = (item: VocabularyItem, intervalLabel: ReviewIntervalLabel) => {
    scheduleVocabularyItem(item.id, intervalLabel);
    setSelectedItem(null);
    setNotice(`${item.sourceText} added to ${intervalLabel}.`);
  };

  const handleMarkKnown = async (item: VocabularyItem) => {
    setSelectedItem(null);
    setNotice(null);

    try {
      await updateVocabularyItemMutation.mutateAsync({
        id: item.id,
        data: { status: "MASTERED" },
      });
      removeScheduledVocabularyItem(item.id);
      setNotice(`${item.sourceText} marked as mastered.`);
    } catch (error) {
      if (!isApiError(error) || error.status !== 401) {
        setNotice(isApiError(error) ? error.message : "Could not update this word.");
      }
    }
  };

  return (
    <ScreenContainer backgroundColor={colors.backgroundWarm} contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={styles.iconButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back-outline" size={24} color={colors.textMuted} />
        </Pressable>
        <Text numberOfLines={1} style={styles.title}>My Vocabulary</Text>
        <View style={styles.topSpacer} />
      </View>

      {notice ? (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      {vocabularyQuery.isLoading ? <StateBox title="Loading words..." /> : null}

      {vocabularyQuery.isError && !hasUnauthorizedError ? (
        <StateBox
          title="Could not load words."
          actionTitle="Try again"
          onAction={() => void vocabularyQuery.refetch()}
        />
      ) : null}

      {!vocabularyQuery.isLoading &&
      !vocabularyQuery.isError &&
      items.length === 0 ? (
        <StateBox title="No words added yet." />
      ) : null}

      {items.map((item) => (
        <VocabularyWordRow
          key={item.id}
          item={item}
          scheduledWord={scheduledWords[item.id]}
          showScheduledOverlay
          onMenuPress={() => setSelectedItem(item)}
          onPress={() =>
            router.push({
              pathname: "/vocabulary/[id]",
              params: { id: item.id },
            })
          }
        />
      ))}

      {vocabularyQuery.hasNextPage && !vocabularyQuery.isError ? (
        <Button
          disabled={vocabularyQuery.isFetchingNextPage}
          loading={vocabularyQuery.isFetchingNextPage}
          title="Load more"
          variant="secondary"
          style={styles.loadMoreButton}
          onPress={() => {
            void vocabularyQuery.fetchNextPage();
          }}
        />
      ) : null}

      <WordActionSheet
        item={selectedItem}
        isUpdating={updateVocabularyItemMutation.isPending}
        onClose={() => setSelectedItem(null)}
        onMarkKnown={(item) => {
          void handleMarkKnown(item);
        }}
        onSchedule={handleScheduleWord}
      />
    </ScreenContainer>
  );
}

type WordActionSheetProps = {
  item: VocabularyItem | null;
  isUpdating: boolean;
  onClose: () => void;
  onMarkKnown: (item: VocabularyItem) => void;
  onSchedule: (item: VocabularyItem, intervalLabel: ReviewIntervalLabel) => void;
};

function WordActionSheet({
  item,
  isUpdating,
  onClose,
  onMarkKnown,
  onSchedule,
}: WordActionSheetProps) {
  return (
    <Modal animationType="fade" transparent visible={Boolean(item)} onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.actionSheet}>
          <View style={styles.sheetHandle} />
          <Text numberOfLines={1} style={styles.sheetTitle}>
            {item?.sourceText ?? "Word actions"}
          </Text>
          <Text numberOfLines={1} style={styles.sheetSubtitle}>
            {item?.targetText ?? ""}
          </Text>

          {item ? (
            <View style={styles.actionList}>
              {REVIEW_INTERVALS.map((interval) => (
                <ActionButton
                  key={interval.label}
                  icon={interval.label.includes("hour") ? "time-outline" : "calendar-outline"}
                  label={`Review in ${interval.label}`}
                  onPress={() => onSchedule(item, interval.label)}
                />
              ))}
              <ActionButton
                disabled={isUpdating || item.userWord.status === "MASTERED"}
                icon="checkmark-circle-outline"
                label={item.userWord.status === "MASTERED" ? "Already mastered" : "I know this word"}
                onPress={() => onMarkKnown(item)}
              />
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type ActionButtonProps = {
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

function ActionButton({ disabled = false, icon, label, onPress }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionButton,
        disabled ? styles.actionButtonDisabled : null,
        pressed ? styles.pressed : null,
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={disabled ? colors.textMuted : colors.navy} />
      <Text style={[styles.actionButtonText, disabled ? styles.actionButtonTextDisabled : null]}>
        {label}
      </Text>
    </Pressable>
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
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.navy,
    flex: 1,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: typography.weights.semibold,
  },
  topSpacer: {
    width: 42,
    height: 42,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeBox: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#DCECC3",
    backgroundColor: "#F4FAE9",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  noticeText: {
    color: colors.green,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typography.weights.bold,
  },
  scheduleCard: {
    minHeight: 96,
    borderTopWidth: 1,
    borderTopColor: "#F0E8DE",
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  scheduleCardIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF7D8",
  },
  scheduleCardBody: {
    flex: 1,
    minWidth: 0,
  },
  scheduleCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  scheduleCardTitle: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: typography.weights.bold,
  },
  scheduleStatusBadge: {
    minHeight: 22,
    borderRadius: radii.pill,
    backgroundColor: "#EEF7D8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  scheduleStatusBadgeDue: {
    backgroundColor: colors.orangeSoft,
  },
  scheduleStatusText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: typography.weights.black,
  },
  scheduleStatusTextDue: {
    color: colors.orange,
  },
  scheduleCardMeta: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
  },
  scheduleCardDetail: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
  scheduleStartButton: {
    minWidth: 70,
    minHeight: 38,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.orange,
    paddingHorizontal: spacing.md,
  },
  scheduleStartButtonDisabled: {
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scheduleStartButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: typography.weights.black,
  },
  scheduleStartButtonTextDisabled: {
    color: colors.textMuted,
  },
  loadMoreButton: {
    marginTop: spacing.sm,
  },
  stateBox: {
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
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(8, 18, 28, 0.42)",
  },
  actionSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    color: colors.navy,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: typography.weights.black,
    textAlign: "center",
  },
  sheetSubtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: typography.weights.semibold,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  actionList: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionButton: {
    minHeight: 54,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  actionButtonDisabled: {
    opacity: 0.56,
  },
  actionButtonText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: typography.weights.bold,
  },
  actionButtonTextDisabled: {
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.72,
  },
});
