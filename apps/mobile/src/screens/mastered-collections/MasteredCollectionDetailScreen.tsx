import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import {
  type MasteredCollectionWord,
  useMasteredCollectionQuery,
} from "@/entities/mastered-collection";
import { useAuthFailureRedirect } from "@/features/auth";
import {
  useDeleteMasteredCollection,
  useRemoveMasteredCollectionWord,
} from "@/features/mastered-collections";
import {
  getReviewIntervalByApiInterval,
  useScheduleUserWord,
  type ScheduledReviewInterval,
} from "@/features/review-boxes";
import { isApiError } from "@/shared/api/http-error";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";
import { VocabularyWordRow } from "@/screens/vocabulary/VocabularyWordRow";
import { ScheduledWordActionSheet } from "@/screens/review-boxes/ScheduledWordActionSheet";
import { MasteredWordActionSheet } from "./MasteredWordActionSheet";

type ActionMode = "actions" | "schedule" | null;
type ConfirmMode = "collection" | "word" | null;

type Feedback = {
  message: string;
  tone: "error" | "success";
};

export function MasteredCollectionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    collectionId?: string | string[];
  }>();
  const collectionId = getParamValue(params.collectionId) ?? "";
  const collectionQuery = useMasteredCollectionQuery(collectionId);
  const removeWordMutation = useRemoveMasteredCollectionWord();
  const deleteCollectionMutation = useDeleteMasteredCollection();
  const scheduleMutation = useScheduleUserWord();
  const [selectedWord, setSelectedWord] =
    useState<MasteredCollectionWord | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const collection = collectionQuery.data;
  const isUpdating =
    removeWordMutation.isPending ||
    deleteCollectionMutation.isPending ||
    scheduleMutation.isPending;
  const hasUnauthorizedError = useAuthFailureRedirect(
    collectionQuery.error ??
      removeWordMutation.error ??
      deleteCollectionMutation.error ??
      scheduleMutation.error,
  );

  const scheduleSelectedWord = async (interval: ScheduledReviewInterval) => {
    if (!selectedWord) {
      return;
    }

    const word = selectedWord;
    setFeedback(null);

    try {
      await scheduleMutation.mutateAsync({
        userWordId: word.userWord.id,
        interval,
      });
      setSelectedWord(null);
      setActionMode(null);
      setFeedback({
        message: `${word.sourceText} added to ${getIntervalLabel(interval)}.`,
        tone: "success",
      });
    } catch (error) {
      if (!isApiError(error) || error.status !== 401) {
        setFeedback({
          message: isApiError(error)
            ? error.message
            : "Could not schedule this word.",
          tone: "error",
        });
      }
    }
  };

  const removeSelectedWord = async () => {
    if (!selectedWord || !collection) {
      return;
    }

    const word = selectedWord;
    setFeedback(null);

    try {
      await removeWordMutation.mutateAsync({
        collectionId: collection.id,
        collectionWordId: word.collectionWordId,
      });
      setConfirmMode(null);
      setSelectedWord(null);
      setFeedback({
        message: `${word.sourceText} removed from this collection.`,
        tone: "success",
      });
    } catch (error) {
      setConfirmMode(null);

      if (!isApiError(error) || error.status !== 401) {
        setFeedback({
          message: isApiError(error)
            ? error.message
            : "Could not remove this word.",
          tone: "error",
        });
      }
    }
  };

  const deleteCollection = async () => {
    if (!collection) {
      return;
    }

    setFeedback(null);

    try {
      await deleteCollectionMutation.mutateAsync(collection.id);
      setConfirmMode(null);
      router.back();
    } catch (error) {
      setConfirmMode(null);

      if (!isApiError(error) || error.status !== 401) {
        setFeedback({
          message: isApiError(error)
            ? error.message
            : "Could not delete this collection.",
          tone: "error",
        });
      }
    }
  };

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
            {collection?.title ?? "Collection"}
          </Text>
          <Text style={styles.subtitle}>
            {collection
              ? `${collection.wordCount} ${
                  collection.wordCount === 1 ? "word" : "words"
                }`
              : "Mastered words"}
          </Text>
        </View>
        {collection ? (
          <Pressable
            accessibilityLabel="Delete collection"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.deleteButton,
              pressed ? styles.pressed : null,
            ]}
            onPress={() => setConfirmMode("collection")}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </Pressable>
        ) : null}
      </View>

      {feedback ? (
        <Text
          style={[
            styles.feedback,
            feedback.tone === "error" ? styles.feedbackError : null,
          ]}
        >
          {feedback.message}
        </Text>
      ) : null}

      {collectionQuery.isLoading ? (
        <StateBox title="Loading collection..." />
      ) : null}

      {collectionQuery.isError && !hasUnauthorizedError ? (
        <StateBox
          actionTitle="Try again"
          title="Could not load this collection."
          onAction={() => void collectionQuery.refetch()}
        />
      ) : null}

      {collection && collection.items.length === 0 ? (
        <StateBox title="This collection is empty. Add mastered words from the Mastered Words screen." />
      ) : null}

      {collection?.items.map((item) => (
        <VocabularyWordRow
          key={item.collectionWordId}
          item={item}
          onMenuPress={() => {
            setSelectedWord(item);
            setActionMode("actions");
          }}
          onPress={() =>
            router.push({
              pathname: "/vocabulary/[id]",
              params: { id: item.id },
            })
          }
        />
      ))}

      <MasteredWordActionSheet
        disabled={isUpdating}
        title={selectedWord?.sourceText ?? "Collection word"}
        visible={actionMode === "actions"}
        onClose={() => {
          setSelectedWord(null);
          setActionMode(null);
        }}
        onRemoveFromCollection={() => {
          setActionMode(null);
          setConfirmMode("word");
        }}
        onReviewLater={() => setActionMode("schedule")}
      />

      <ScheduledWordActionSheet
        disabled={isUpdating}
        title={selectedWord?.sourceText ?? "Collection word"}
        visible={actionMode === "schedule"}
        onClose={() => {
          setSelectedWord(null);
          setActionMode(null);
        }}
        onMove={(interval) => {
          void scheduleSelectedWord(interval);
        }}
      />

      <ConfirmModal
        confirmTitle="Remove"
        loading={removeWordMutation.isPending}
        message={
          selectedWord
            ? `Remove ${selectedWord.sourceText} from this collection? The word and its progress will stay in your account.`
            : ""
        }
        title="Remove word"
        visible={confirmMode === "word"}
        onCancel={() => {
          setConfirmMode(null);
          setSelectedWord(null);
        }}
        onConfirm={() => void removeSelectedWord()}
      />

      <ConfirmModal
        confirmTitle="Delete"
        loading={deleteCollectionMutation.isPending}
        message="Delete this collection? Its words and learning progress will not be deleted."
        title="Delete collection"
        visible={confirmMode === "collection"}
        onCancel={() => setConfirmMode(null)}
        onConfirm={() => void deleteCollection()}
      />
    </ScreenContainer>
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

type ConfirmModalProps = {
  confirmTitle: string;
  loading: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
};

function ConfirmModal({
  confirmTitle,
  loading,
  message,
  onCancel,
  onConfirm,
  title,
  visible,
}: ConfirmModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>{title}</Text>
          <Text style={styles.confirmMessage}>{message}</Text>
          <View style={styles.confirmActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: loading }}
              disabled={loading}
              style={({ pressed }) => [
                styles.confirmButton,
                styles.cancelButton,
                pressed ? styles.pressed : null,
              ]}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: loading }}
              disabled={loading}
              style={({ pressed }) => [
                styles.confirmButton,
                styles.dangerButton,
                loading ? styles.disabled : null,
                pressed ? styles.pressed : null,
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.dangerText}>
                {loading ? "Please wait..." : confirmTitle}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getIntervalLabel(interval: ScheduledReviewInterval) {
  return getReviewIntervalByApiInterval(interval)?.label ?? interval;
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
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "#F0B8B0",
    backgroundColor: "#FFF1F1",
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
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  feedback: {
    color: colors.green,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.bold,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  feedbackError: {
    color: colors.error,
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
    fontSize: 14,
    lineHeight: 19,
    fontWeight: typography.weights.bold,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8, 18, 28, 0.42)",
    padding: spacing.xl,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing.xl,
  },
  confirmTitle: {
    color: colors.navy,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: typography.weights.black,
  },
  confirmMessage: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: typography.weights.medium,
    marginTop: spacing.sm,
  },
  confirmActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  confirmButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  dangerButton: {
    backgroundColor: "#C93439",
  },
  cancelText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: typography.weights.black,
  },
  dangerText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: typography.weights.black,
  },
  disabled: {
    opacity: 0.54,
  },
  pressed: {
    opacity: 0.72,
  },
});
