import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  type DeckWord,
  type DeckWordDraft,
  useDeckQuery,
} from "@/entities/deck";
import type { WordType } from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import { useAddDeckWords } from "@/features/decks";
import {
  REVIEW_INTERVALS,
  getReviewIntervalByApiInterval,
  useCancelScheduledReview,
  useScheduleUserWord,
  useScheduledReviewsQuery,
  type ReviewInterval,
  type ScheduledReviewItem,
} from "@/features/review-boxes";
import { useUpdateVocabularyItem } from "@/features/vocabulary";
import { isApiError } from "@/shared/api/http-error";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";
import { VocabularyWordRow } from "@/screens/vocabulary/VocabularyWordRow";

const DEFAULT_WORD_TYPE: WordType = "OTHER";

export function DeckDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ deckId?: string | string[] }>();
  const deckId = getParamValue(params.deckId);
  const deckQuery = useDeckQuery(deckId);
  const addDeckWordsMutation = useAddDeckWords(deckId);
  const scheduleUserWordMutation = useScheduleUserWord();
  const scheduledReviewsQuery = useScheduledReviewsQuery();
  const updateVocabularyItemMutation = useUpdateVocabularyItem();
  const cancelScheduledReviewMutation = useCancelScheduledReview();
  const [isAddWordsModalVisible, setAddWordsModalVisible] = useState(false);
  const [selectedWord, setSelectedWord] = useState<DeckWord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const hasUnauthorizedError = useAuthFailureRedirect(
    deckQuery.error ??
      addDeckWordsMutation.error ??
      scheduleUserWordMutation.error ??
      scheduledReviewsQuery.error ??
      updateVocabularyItemMutation.error ??
      cancelScheduledReviewMutation.error,
  );
  const deck = deckQuery.data;
  const scheduledByVocabularyItemId = useMemo(
    () =>
      new Map(
        (scheduledReviewsQuery.data?.items ?? []).map((item) => [
          item.vocabularyItemId,
          item,
        ]),
      ),
    [scheduledReviewsQuery.data?.items],
  );

  const handleScheduleWord = async (word: DeckWord, interval: ReviewInterval) => {
    setNotice(null);

    try {
      await scheduleUserWordMutation.mutateAsync({
        userWordId: word.userWord.id,
        interval: interval.apiInterval,
      });
      setSelectedWord(null);
      setNotice(`${word.sourceText} added to ${interval.label}.`);
    } catch (error) {
      if (!isApiError(error) || error.status !== 401) {
        setNotice(isApiError(error) ? error.message : "Could not schedule this word.");
      }
    }
  };

  const handleMarkKnown = async (word: DeckWord) => {
    const scheduledReview = scheduledByVocabularyItemId.get(word.id);
    setNotice(null);

    try {
      await updateVocabularyItemMutation.mutateAsync({
        id: word.id,
        data: { status: "MASTERED" },
      });

      if (scheduledReview) {
        await cancelScheduledReviewMutation.mutateAsync(scheduledReview.scheduleId);
      }

      setSelectedWord(null);
      setNotice(`${word.sourceText} marked as mastered.`);
    } catch (error) {
      if (!isApiError(error) || error.status !== 401) {
        setNotice(isApiError(error) ? error.message : "Could not update this word.");
      }
    }
  };

  const handleAddWords = async (drafts: DeckWordDraft[]) => {
    const words = drafts.map((draft) => ({
      sourceText: draft.sourceText.trim(),
      targetText: draft.targetText.trim(),
      wordType: draft.wordType ?? DEFAULT_WORD_TYPE,
      ...(draft.definition?.trim() ? { definition: draft.definition.trim() } : {}),
      ...(draft.note?.trim() ? { note: draft.note.trim() } : {}),
    }));

    await addDeckWordsMutation.mutateAsync({ words });
    setAddWordsModalVisible(false);
    setNotice(`${words.length} ${words.length === 1 ? "word" : "words"} added.`);
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
          <Ionicons name="chevron-back" size={26} color={colors.textMuted} />
        </Pressable>

        <View style={styles.titleBlock}>
          <Text numberOfLines={1} style={styles.title}>
            {deck?.title ?? "Deck"}
          </Text>
          <Text numberOfLines={1} style={styles.subtitle}>
            {deck ? `${deck.wordCount} ${deck.wordCount === 1 ? "word" : "words"} - ${deck.progressPercent}%` : "Loading"}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Add words"
          accessibilityRole="button"
          style={({ pressed }) => [styles.addButton, pressed ? styles.pressed : null]}
          onPress={() => setAddWordsModalVisible(true)}
        >
          <Ionicons name="add" size={26} color={colors.white} />
        </Pressable>
      </View>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {deckQuery.isLoading ? <StateBox title="Loading deck..." /> : null}

      {deckQuery.isError && !hasUnauthorizedError ? (
        <StateBox
          title="Could not load deck."
          actionTitle="Try again"
          onAction={() => void deckQuery.refetch()}
        />
      ) : null}

      {deck && deck.items.length === 0 ? (
        <StateBox
          title="No words in this deck yet."
          actionTitle="Add words"
          onAction={() => setAddWordsModalVisible(true)}
        />
      ) : null}

      {deck?.items.map((word) => (
        <VocabularyWordRow
          key={word.deckCardId}
          item={word}
          scheduledWord={toScheduledWordPreview(scheduledByVocabularyItemId.get(word.id))}
          showScheduledOverlay
          onMenuPress={() => setSelectedWord(word)}
          onPress={() =>
            router.push({
              pathname: "/vocabulary/[id]",
              params: { id: word.id },
            })
          }
        />
      ))}

      <DeckWordActionSheet
        isUpdating={
          scheduleUserWordMutation.isPending ||
          updateVocabularyItemMutation.isPending ||
          cancelScheduledReviewMutation.isPending
        }
        word={selectedWord}
        onClose={() => setSelectedWord(null)}
        onMarkKnown={(word) => {
          void handleMarkKnown(word);
        }}
        onSchedule={(word, interval) => {
          void handleScheduleWord(word, interval);
        }}
      />

      <AddWordsModal
        loading={addDeckWordsMutation.isPending}
        visible={isAddWordsModalVisible}
        onClose={() => setAddWordsModalVisible(false)}
        onSubmit={(drafts) => {
          void handleAddWords(drafts);
        }}
      />
    </ScreenContainer>
  );
}

type DeckWordActionSheetProps = {
  isUpdating: boolean;
  onClose: () => void;
  onMarkKnown: (word: DeckWord) => void;
  onSchedule: (word: DeckWord, interval: ReviewInterval) => void;
  word: DeckWord | null;
};

function DeckWordActionSheet({
  isUpdating,
  onClose,
  onMarkKnown,
  onSchedule,
  word,
}: DeckWordActionSheetProps) {
  return (
    <Modal animationType="fade" transparent visible={Boolean(word)} onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={styles.actionSheet}>
          <View style={styles.sheetHandle} />
          <Text numberOfLines={1} style={styles.sheetTitle}>
            {word?.sourceText ?? "Word actions"}
          </Text>
          <Text numberOfLines={1} style={styles.sheetSubtitle}>
            {word?.targetText ?? ""}
          </Text>

          {word ? (
            <View style={styles.actionList}>
              {REVIEW_INTERVALS.map((interval) => (
                <ActionButton
                  key={interval.apiInterval}
                  disabled={isUpdating}
                  icon={interval.label.includes("hour") ? "time-outline" : "calendar-outline"}
                  label={`Review in ${interval.label}`}
                  onPress={() => onSchedule(word, interval)}
                />
              ))}
              <ActionButton
                disabled={isUpdating || word.userWord.status === "MASTERED"}
                icon="checkmark-circle-outline"
                label={word.userWord.status === "MASTERED" ? "Already mastered" : "I know this word"}
                onPress={() => onMarkKnown(word)}
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

type AddWordsModalProps = {
  loading: boolean;
  onClose: () => void;
  onSubmit: (drafts: DeckWordDraft[]) => void;
  visible: boolean;
};

function AddWordsModal({ loading, onClose, onSubmit, visible }: AddWordsModalProps) {
  const [drafts, setDrafts] = useState<DeckWordDraft[]>(() => [createWordDraft()]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const validDrafts = drafts
      .map((draft) => ({
        ...draft,
        sourceText: draft.sourceText.trim(),
        targetText: draft.targetText.trim(),
      }))
      .filter((draft) => draft.sourceText || draft.targetText);

    if (validDrafts.length === 0) {
      setError("Add at least one word.");
      return;
    }

    const incompleteDraft = validDrafts.find(
      (draft) => !draft.sourceText || !draft.targetText,
    );

    if (incompleteDraft) {
      setError("Every word needs both source and target text.");
      return;
    }

    setError(null);
    onSubmit(validDrafts);
    setDrafts([createWordDraft()]);
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <ScreenContainer backgroundColor={colors.backgroundWarm} contentStyle={styles.modalContent}>
        <View style={styles.wordModalTopBar}>
          <Pressable accessibilityRole="button" style={styles.iconButton} onPress={onClose}>
            <Ionicons name="chevron-back" size={27} color={colors.textMuted} />
          </Pressable>
          <Text style={styles.wordModalTitle}>New words</Text>
          <View style={styles.wordModalTools}>
            <Ionicons name="options-outline" size={25} color={colors.textMuted} />
            <Ionicons name="help-circle-outline" size={25} color={colors.textMuted} />
          </View>
        </View>

        {drafts.map((draft, index) => (
          <View key={draft.id} style={styles.wordDraftCard}>
            <View style={styles.draftNumber}>
              <Text style={styles.draftNumberText}>{index + 1}</Text>
            </View>
            <TextInput
              autoCapitalize="none"
              maxLength={200}
              placeholder="English"
              placeholderTextColor="#8F95A3"
              selectionColor={colors.orange}
              style={styles.wordDraftInput}
              value={draft.sourceText}
              onChangeText={(value) => {
                setDrafts((current) => updateDraft(current, draft.id, { sourceText: value }));
                setError(null);
              }}
            />
            <View style={styles.wordDraftLine} />
            <TextInput
              autoCapitalize="none"
              maxLength={200}
              placeholder="Translation"
              placeholderTextColor="#8F95A3"
              selectionColor={colors.orange}
              style={styles.wordDraftInput}
              value={draft.targetText}
              onChangeText={(value) => {
                setDrafts((current) => updateDraft(current, draft.id, { targetText: value }));
                setError(null);
              }}
            />
            <View style={styles.wordDraftFooter}>
              <View style={styles.wordDraftChip}>
                <Text style={styles.wordDraftChipText}>Transcription</Text>
              </View>
              <View style={styles.wordDraftChip}>
                <Text style={styles.wordDraftChipText}>Example</Text>
              </View>
              <View style={[styles.wordDraftChip, styles.wordDraftChipOrange]}>
                <Text style={[styles.wordDraftChipText, styles.wordDraftChipTextOrange]}>Image</Text>
              </View>
            </View>
          </View>
        ))}

        {error ? <Text style={styles.modalError}>{error}</Text> : null}

        <Pressable
          accessibilityLabel="Add another word row"
          accessibilityRole="button"
          style={({ pressed }) => [styles.modalPlusButton, pressed ? styles.pressed : null]}
          onPress={() => setDrafts((current) => [...current, createWordDraft()])}
        >
          <Ionicons name="add" size={38} color={colors.white} />
        </Pressable>

        <Button
          disabled={loading}
          loading={loading}
          title={loading ? "Adding..." : "Add to deck"}
          style={styles.submitWordsButton}
          onPress={handleSubmit}
        />
      </ScreenContainer>
    </Modal>
  );
}

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

function createWordDraft(): DeckWordDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sourceText: "",
    targetText: "",
    wordType: DEFAULT_WORD_TYPE,
  };
}

function updateDraft(
  drafts: DeckWordDraft[],
  id: string,
  patch: Partial<DeckWordDraft>,
): DeckWordDraft[] {
  return drafts.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft));
}

function toScheduledWordPreview(scheduledReview: ScheduledReviewItem | undefined) {
  if (!scheduledReview) {
    return undefined;
  }

  return {
    intervalLabel:
      getReviewIntervalByApiInterval(scheduledReview.interval)?.label ??
      scheduledReview.interval,
  };
}

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
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
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.navy,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: typography.weights.black,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: radii.lg,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  notice: {
    color: colors.green,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typography.weights.bold,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
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
  sheetOverlay: {
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
  modalContent: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  wordModalTopBar: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  wordModalTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: typography.weights.medium,
  },
  wordModalTools: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  wordDraftCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2D9CD",
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    marginBottom: spacing.lg,
  },
  draftNumber: {
    position: "absolute",
    left: spacing.md,
    top: spacing.md,
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "#E5E1DB",
    alignItems: "center",
    justifyContent: "center",
  },
  draftNumberText: {
    color: "#B4BAC4",
    fontSize: 14,
    fontWeight: typography.weights.medium,
  },
  wordDraftInput: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: typography.weights.regular,
    paddingVertical: spacing.md,
  },
  wordDraftLine: {
    height: 1,
    backgroundColor: "#A9AEB8",
  },
  wordDraftFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  wordDraftChip: {
    minHeight: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  wordDraftChipOrange: {
    borderColor: "#F0C8A5",
  },
  wordDraftChipText: {
    color: "#8F95A3",
    fontSize: 15,
    fontWeight: typography.weights.medium,
  },
  wordDraftChipTextOrange: {
    color: colors.orange,
  },
  modalPlusButton: {
    width: 70,
    height: 70,
    borderRadius: radii.lg,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: spacing.md,
  },
  submitWordsButton: {
    marginTop: spacing.xl,
  },
  modalError: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typography.weights.bold,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.72,
  },
});
