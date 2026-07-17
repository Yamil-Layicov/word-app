import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  type MasteredCollectionSummary,
  useMasteredCollectionsQuery,
} from "@/entities/mastered-collection";
import {
  type VocabularyItem,
  useInfiniteVocabularyItemsQuery,
} from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import {
  useAddMasteredCollectionWords,
  useCreateMasteredCollection,
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
import { CreateMasteredCollectionModal } from "./CreateMasteredCollectionModal";
import { MasteredCollectionPickerModal } from "./MasteredCollectionPickerModal";
import { MasteredWordActionSheet } from "./MasteredWordActionSheet";

const EMPTY_COLLECTIONS: MasteredCollectionSummary[] = [];

type WordActionMode = "actions" | "schedule" | null;

type Feedback = {
  message: string;
  tone: "error" | "success";
};

export function MasteredWordsScreen() {
  const router = useRouter();
  const collectionsQuery = useMasteredCollectionsQuery();
  const masteredWordsQuery = useInfiniteVocabularyItemsQuery({
    status: "MASTERED",
    limit: 50,
  });
  const createCollectionMutation = useCreateMasteredCollection();
  const addWordsMutation = useAddMasteredCollectionWords();
  const scheduleMutation = useScheduleUserWord();
  const [isSelectionMode, setSelectionMode] = useState(false);
  const [selectedUserWordIds, setSelectedUserWordIds] = useState(
    () => new Set<string>(),
  );
  const [pendingUserWordIds, setPendingUserWordIds] = useState<string[]>([]);
  const [selectedWord, setSelectedWord] = useState<VocabularyItem | null>(null);
  const [wordActionMode, setWordActionMode] = useState<WordActionMode>(null);
  const [isCollectionPickerVisible, setCollectionPickerVisible] =
    useState(false);
  const [isCreateCollectionVisible, setCreateCollectionVisible] =
    useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const collections = collectionsQuery.data?.items ?? EMPTY_COLLECTIONS;
  const masteredWords = useMemo(
    () => masteredWordsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [masteredWordsQuery.data?.pages],
  );
  const isUpdating =
    createCollectionMutation.isPending ||
    addWordsMutation.isPending ||
    scheduleMutation.isPending;
  const hasUnauthorizedError = useAuthFailureRedirect(
    collectionsQuery.error ??
      masteredWordsQuery.error ??
      createCollectionMutation.error ??
      addWordsMutation.error ??
      scheduleMutation.error,
  );

  const toggleWordSelection = (userWordId: string) => {
    setSelectedUserWordIds((current) => {
      const next = new Set(current);

      if (next.has(userWordId)) {
        next.delete(userWordId);
      } else {
        next.add(userWordId);
      }

      return next;
    });
  };

  const closeSelectionMode = () => {
    setSelectionMode(false);
    setSelectedUserWordIds(new Set());
  };

  const openCollectionPicker = (userWordIds: string[]) => {
    if (userWordIds.length === 0) {
      return;
    }

    addWordsMutation.reset();
    setPendingUserWordIds([...new Set(userWordIds)]);
    setCollectionPickerVisible(true);
  };

  const completeCollectionAssignment = (
    collectionTitle: string,
    wordCount: number,
  ) => {
    setCollectionPickerVisible(false);
    setCreateCollectionVisible(false);
    setPendingUserWordIds([]);
    setSelectedWord(null);
    setWordActionMode(null);
    closeSelectionMode();
    setFeedback({
      message: `${wordCount} ${
        wordCount === 1 ? "word" : "words"
      } added to ${collectionTitle}.`,
      tone: "success",
    });
  };

  const addPendingWordsToCollection = async (collectionId: string) => {
    if (pendingUserWordIds.length === 0) {
      return;
    }

    setFeedback(null);

    try {
      const collection = await addWordsMutation.mutateAsync({
        collectionId,
        input: {
          userWordIds: pendingUserWordIds,
        },
      });
      completeCollectionAssignment(collection.title, pendingUserWordIds.length);
    } catch (error) {
      if (!isApiError(error) || error.status !== 401) {
        setFeedback({
          message: isApiError(error)
            ? error.message
            : "Could not add words to this collection.",
          tone: "error",
        });
      }
    }
  };

  const createCollection = async (input: {
    description?: string;
    title: string;
  }) => {
    setFeedback(null);

    try {
      const collection = await createCollectionMutation.mutateAsync(input);
      setCreateCollectionVisible(false);

      if (pendingUserWordIds.length === 0) {
        setFeedback({
          message: `${collection.title} created.`,
          tone: "success",
        });
        return true;
      }

      try {
        const updatedCollection = await addWordsMutation.mutateAsync({
          collectionId: collection.id,
          input: {
            userWordIds: pendingUserWordIds,
          },
        });
        completeCollectionAssignment(
          updatedCollection.title,
          pendingUserWordIds.length,
        );
      } catch (error) {
        setCollectionPickerVisible(true);
        setFeedback({
          message: isApiError(error)
            ? `${collection.title} was created, but the words were not added: ${error.message}`
            : `${collection.title} was created, but the words were not added.`,
          tone: "error",
        });
      }

      return true;
    } catch (error) {
      if (!isApiError(error) || error.status !== 401) {
        setFeedback({
          message: isApiError(error)
            ? error.message
            : "Could not create this collection.",
          tone: "error",
        });
      }

      return false;
    }
  };

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
      setWordActionMode(null);
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

  return (
    <ScreenContainer
      backgroundColor={colors.backgroundWarm}
      contentStyle={styles.content}
      footer={
        isSelectionMode ? (
          <View style={styles.selectionFooter}>
            <View>
              <Text style={styles.selectionCount}>
                {selectedUserWordIds.size} selected
              </Text>
              <Text style={styles.selectionHint}>
                Add the selected words to one collection.
              </Text>
            </View>
            <Button
              disabled={selectedUserWordIds.size === 0}
              style={styles.selectionButton}
              title="Add"
              onPress={() => openCollectionPicker([...selectedUserWordIds])}
            />
          </View>
        ) : null
      }
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
            Mastered Words
          </Text>
          <Text style={styles.subtitle}>
            {masteredWords.length}
            {masteredWordsQuery.hasNextPage ? "+" : ""} words loaded
          </Text>
        </View>

        {isSelectionMode ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.doneButton,
              pressed ? styles.pressed : null,
            ]}
            onPress={closeSelectionMode}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              accessibilityLabel="Select mastered words"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.iconButton,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => {
                setFeedback(null);
                setSelectionMode(true);
              }}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={23}
                color={colors.navy}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="Create collection"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.addButton,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => {
                createCollectionMutation.reset();
                setPendingUserWordIds([]);
                setCreateCollectionVisible(true);
              }}
            >
              <Ionicons name="add" size={22} color={colors.white} />
            </Pressable>
          </>
        )}
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

      {!isSelectionMode ? (
        <View style={styles.collectionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Collections</Text>
            <Text style={styles.sectionMeta}>{collections.length}</Text>
          </View>

          {collectionsQuery.isLoading ? (
            <StateBox title="Loading collections..." />
          ) : null}

          {collectionsQuery.isError && !hasUnauthorizedError ? (
            <StateBox
              actionTitle="Try again"
              title="Could not load collections."
              onAction={() => void collectionsQuery.refetch()}
            />
          ) : null}

          {!collectionsQuery.isLoading &&
          !collectionsQuery.isError &&
          collections.length === 0 ? (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.emptyCollection,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => {
                createCollectionMutation.reset();
                setPendingUserWordIds([]);
                setCreateCollectionVisible(true);
              }}
            >
              <Ionicons
                name="folder-open-outline"
                size={25}
                color={colors.orange}
              />
              <View style={styles.emptyCollectionText}>
                <Text style={styles.emptyCollectionTitle}>
                  Create your first collection
                </Text>
                <Text style={styles.emptyCollectionSubtitle}>
                  Group mastered words without changing their progress.
                </Text>
              </View>
            </Pressable>
          ) : null}

          {collections.length > 0 ? (
            <View style={styles.collectionGrid}>
              {collections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  onPress={() =>
                    router.push({
                      pathname: "/decks/collections/[collectionId]",
                      params: { collectionId: collection.id },
                    })
                  }
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.wordsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isSelectionMode ? "Choose words" : "All mastered words"}
          </Text>
          {!isSelectionMode ? (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.selectTextButton,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => setSelectionMode(true)}
            >
              <Text style={styles.selectText}>Select</Text>
            </Pressable>
          ) : null}
        </View>

        {masteredWordsQuery.isLoading ? (
          <StateBox title="Loading mastered words..." />
        ) : null}

        {masteredWordsQuery.isError && !hasUnauthorizedError ? (
          <StateBox
            actionTitle="Try again"
            title="Could not load mastered words."
            onAction={() => void masteredWordsQuery.refetch()}
          />
        ) : null}

        {!masteredWordsQuery.isLoading &&
        !masteredWordsQuery.isError &&
        masteredWords.length === 0 ? (
          <StateBox title="No mastered words yet." />
        ) : null}

        {masteredWords.map((item) => (
          <VocabularyWordRow
            key={item.id}
            item={item}
            selected={selectedUserWordIds.has(item.userWord.id)}
            selectionMode={isSelectionMode}
            onMenuPress={
              isSelectionMode
                ? undefined
                : () => {
                    setSelectedWord(item);
                    setWordActionMode("actions");
                  }
            }
            onPress={() => {
              if (isSelectionMode) {
                toggleWordSelection(item.userWord.id);
                return;
              }

              router.push({
                pathname: "/vocabulary/[id]",
                params: { id: item.id },
              });
            }}
          />
        ))}

        {masteredWordsQuery.hasNextPage ? (
          <Button
            loading={masteredWordsQuery.isFetchingNextPage}
            style={styles.loadMoreButton}
            title="Load more"
            variant="secondary"
            onPress={() => void masteredWordsQuery.fetchNextPage()}
          />
        ) : null}
      </View>

      <MasteredWordActionSheet
        disabled={isUpdating}
        title={selectedWord?.sourceText ?? "Mastered word"}
        visible={wordActionMode === "actions"}
        onAddToCollection={() => {
          if (!selectedWord) {
            return;
          }

          setWordActionMode(null);
          openCollectionPicker([selectedWord.userWord.id]);
        }}
        onClose={() => {
          setSelectedWord(null);
          setWordActionMode(null);
        }}
        onReviewLater={() => setWordActionMode("schedule")}
      />

      <ScheduledWordActionSheet
        disabled={isUpdating}
        title={selectedWord?.sourceText ?? "Mastered word"}
        visible={wordActionMode === "schedule"}
        onClose={() => {
          setSelectedWord(null);
          setWordActionMode(null);
        }}
        onMove={(interval) => {
          void scheduleSelectedWord(interval);
        }}
      />

      <MasteredCollectionPickerModal
        collections={collections}
        error={addWordsMutation.error}
        loading={addWordsMutation.isPending}
        selectedWordCount={pendingUserWordIds.length}
        visible={isCollectionPickerVisible}
        onClose={() => {
          if (!addWordsMutation.isPending) {
            setCollectionPickerVisible(false);
            setPendingUserWordIds([]);
            setSelectedWord(null);
          }
        }}
        onCreateNew={() => {
          createCollectionMutation.reset();
          setCollectionPickerVisible(false);
          setCreateCollectionVisible(true);
        }}
        onSelect={(collectionId) => {
          void addPendingWordsToCollection(collectionId);
        }}
      />

      <CreateMasteredCollectionModal
        error={createCollectionMutation.error}
        loading={createCollectionMutation.isPending}
        visible={isCreateCollectionVisible}
        onClose={() => {
          setCreateCollectionVisible(false);

          if (pendingUserWordIds.length > 0) {
            setCollectionPickerVisible(true);
          }
        }}
        onCreate={createCollection}
      />
    </ScreenContainer>
  );
}

type CollectionCardProps = {
  collection: MasteredCollectionSummary;
  onPress: () => void;
};

function CollectionCard({ collection, onPress }: CollectionCardProps) {
  const allWordsAreMastered =
    collection.wordCount === collection.masteredWordCount;

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.collectionCard,
        pressed ? styles.pressed : null,
      ]}
      onPress={onPress}
    >
      <View style={styles.collectionCardIcon}>
        <Ionicons name="folder" size={23} color={colors.green} />
      </View>
      <Text numberOfLines={2} style={styles.collectionCardTitle}>
        {collection.title}
      </Text>
      <Text style={styles.collectionCardMeta}>
        {allWordsAreMastered
          ? `${collection.wordCount} ${
              collection.wordCount === 1 ? "word" : "words"
            }`
          : `${collection.masteredWordCount}/${collection.wordCount} mastered`}
      </Text>
    </Pressable>
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
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.orange,
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
  doneButton: {
    minHeight: 38,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  doneButtonText: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: typography.weights.black,
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
  collectionsSection: {
    marginBottom: spacing.xl,
  },
  wordsSection: {
    marginTop: spacing.sm,
  },
  sectionHeader: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: typography.weights.black,
  },
  sectionMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
  selectTextButton: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  selectText: {
    color: colors.orange,
    fontSize: 13,
    fontWeight: typography.weights.black,
  },
  collectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
  },
  collectionCard: {
    width: "47.8%",
    minHeight: 126,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  collectionCardIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: "#F2F8E8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  collectionCardTitle: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: typography.weights.black,
  },
  collectionCardMeta: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: typography.weights.medium,
    marginTop: "auto",
    paddingTop: spacing.sm,
  },
  emptyCollection: {
    minHeight: 78,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  emptyCollectionText: {
    flex: 1,
    minWidth: 0,
  },
  emptyCollectionTitle: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typography.weights.black,
  },
  emptyCollectionSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: typography.weights.medium,
    marginTop: 2,
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
  loadMoreButton: {
    minHeight: 46,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  selectionFooter: {
    minHeight: 76,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  selectionCount: {
    color: colors.navy,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: typography.weights.black,
  },
  selectionHint: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
  selectionButton: {
    minWidth: 94,
    minHeight: 46,
    marginLeft: "auto",
  },
  pressed: {
    opacity: 0.72,
  },
});
