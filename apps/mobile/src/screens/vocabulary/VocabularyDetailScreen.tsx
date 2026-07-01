import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { type UserWordStatus, useVocabularyItemQuery } from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import { useArchiveVocabularyItem, useUpdateVocabularyItem } from "@/features/vocabulary";
import { isApiError } from "@/shared/api/http-error";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

const STATUS_OPTIONS: UserWordStatus[] = ["NEW", "LEARNING", "REVIEWING", "MASTERED"];

export function VocabularyDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const vocabularyItemId = typeof params.id === "string" ? params.id : "";
  const vocabularyItemQuery = useVocabularyItemQuery(vocabularyItemId);
  const updateVocabularyItemMutation = useUpdateVocabularyItem();
  const archiveVocabularyItemMutation = useArchiveVocabularyItem();
  const [notice, setNotice] = useState<string | null>(null);
  const hasUnauthorizedError = useAuthFailureRedirect(
    vocabularyItemQuery.error ??
      updateVocabularyItemMutation.error ??
      archiveVocabularyItemMutation.error,
  );
  const item = vocabularyItemQuery.data;
  const isMutating = updateVocabularyItemMutation.isPending || archiveVocabularyItemMutation.isPending;

  const handleToggleFavorite = async () => {
    if (!item) {
      return;
    }

    const nextFavoriteState = !item.userWord.isFavorite;
    setNotice(null);

    try {
      await updateVocabularyItemMutation.mutateAsync({
        id: item.id,
        data: { isFavorite: nextFavoriteState },
      });
      setNotice(nextFavoriteState ? "Added to favorites." : "Removed from favorites.");
    } catch (error) {
      if (!isApiError(error) || error.status !== 401) {
        setNotice(isApiError(error) ? error.message : "Could not update favorite.");
      }
    }
  };

  const handleChangeStatus = async (nextStatus: UserWordStatus) => {
    if (!item || item.userWord.status === nextStatus) {
      return;
    }

    setNotice(null);

    try {
      await updateVocabularyItemMutation.mutateAsync({
        id: item.id,
        data: { status: nextStatus },
      });
      setNotice(`Status changed to ${formatStatusLabel(nextStatus)}.`);
    } catch (error) {
      if (!isApiError(error) || error.status !== 401) {
        setNotice(isApiError(error) ? error.message : "Could not update status.");
      }
    }
  };

  const handleArchive = () => {
    if (!item) {
      return;
    }

    Alert.alert("Archive word", "This word will be removed from your active vocabulary list.", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Archive",
        style: "destructive",
        onPress: () => {
          void archiveWord(item.id);
        },
      },
    ]);
  };

  const archiveWord = async (id: string) => {
    setNotice(null);

    try {
      await archiveVocabularyItemMutation.mutateAsync(id);
      router.replace("/vocabulary");
    } catch (error) {
      if (!isApiError(error) || error.status !== 401) {
        setNotice(isApiError(error) ? error.message : "Could not archive word.");
      }
    }
  };

  return (
    <ScreenContainer backgroundColor={colors.backgroundWarm} contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.orange} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>

      {vocabularyItemQuery.isLoading ? <StateBox title="Loading word..." /> : null}

      {vocabularyItemQuery.isError && !hasUnauthorizedError ? (
        <StateBox
          title="Could not load this word."
          actionTitle="Try again"
          onAction={() => void vocabularyItemQuery.refetch()}
        />
      ) : null}

      {item ? (
        <>
          <View style={styles.header}>
            <View style={styles.iconShell}>
              <Ionicons name="book-outline" size={30} color={colors.white} />
            </View>
            <Text style={styles.sourceText}>{item.sourceText}</Text>
            <Text style={styles.targetText}>{item.targetText}</Text>
            <Text style={styles.metaText}>
              {item.wordType.replace("_", " ").toLowerCase()} - {item.cefrLevel || "No level"} -{" "}
              {item.userWord.status.toLowerCase()}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isMutating }}
              disabled={isMutating}
              style={[
                styles.favoriteButton,
                item.userWord.isFavorite ? styles.favoriteButtonActive : null,
                isMutating ? styles.favoriteButtonDisabled : null,
              ]}
              onPress={handleToggleFavorite}
            >
              <Ionicons
                name={item.userWord.isFavorite ? "star" : "star-outline"}
                size={18}
                color={item.userWord.isFavorite ? colors.white : colors.orange}
              />
              <Text
                style={[
                  styles.favoriteButtonText,
                  item.userWord.isFavorite ? styles.favoriteButtonTextActive : null,
                ]}
              >
                {updateVocabularyItemMutation.isPending
                  ? "Saving..."
                  : item.userWord.isFavorite
                    ? "Favorite"
                    : "Add favorite"}
              </Text>
            </Pressable>
          </View>

          {notice ? (
            <Text style={[styles.notice, updateVocabularyItemMutation.isError ? styles.noticeError : null]}>
              {notice}
            </Text>
          ) : null}

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Learning status</Text>
            <View style={styles.statusGrid}>
              {STATUS_OPTIONS.map((status) => (
                <StatusButton
                  key={status}
                  disabled={isMutating}
                  label={formatStatusLabel(status)}
                  selected={item.userWord.status === status}
                  onPress={() => {
                    void handleChangeStatus(status);
                  }}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <InfoRow label="Definition" value={item.definition || "Not set"} />
            <InfoRow label="Note" value={item.note || "Not set"} />
            <InfoRow label="Favorite" value={item.userWord.isFavorite ? "Yes" : "No"} />
            <InfoRow label="Reviews" value={String(item.userWord.reviewCount)} />
            <InfoRow label="Correct / Wrong" value={`${item.userWord.correctCount} / ${item.userWord.wrongCount}`} />
            <InfoRow label="Next review" value={formatOptionalDate(item.userWord.nextReviewAt)} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isMutating }}
            disabled={isMutating}
            style={[styles.archiveButton, isMutating ? styles.archiveButtonDisabled : null]}
            onPress={handleArchive}
          >
            <Ionicons name="archive-outline" size={18} color={colors.error} />
            <Text style={styles.archiveButtonText}>
              {archiveVocabularyItemMutation.isPending ? "Archiving..." : "Archive word"}
            </Text>
          </Pressable>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Examples</Text>
          </View>

          {item.examples.length === 0 ? <StateBox title="No examples added." /> : null}

          {item.examples.map((example) => (
            <View key={example.id} style={styles.exampleCard}>
              <Text style={styles.exampleSource}>{example.sourceSentence}</Text>
              <Text style={styles.exampleTarget}>{example.targetSentence}</Text>
            </View>
          ))}
        </>
      ) : null}
    </ScreenContainer>
  );
}

type StatusButtonProps = {
  disabled: boolean;
  label: string;
  selected: boolean;
  onPress: () => void;
};

function StatusButton({ disabled, label, selected, onPress }: StatusButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || selected, selected }}
      disabled={disabled || selected}
      style={[
        styles.statusButton,
        selected ? styles.statusButtonSelected : null,
        disabled ? styles.statusButtonDisabled : null,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.statusButtonText, selected ? styles.statusButtonTextSelected : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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

function formatOptionalDate(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Date(value).toLocaleDateString();
}

function formatStatusLabel(value: UserWordStatus) {
  return value
    .split("_")
    .map((part) => part.slice(0, 1) + part.slice(1).toLowerCase())
    .join(" ");
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    minHeight: 40,
    justifyContent: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    minHeight: 36,
  },
  backText: {
    color: colors.orange,
    fontSize: 15,
    fontWeight: typography.weights.bold,
  },
  header: {
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  iconShell: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy,
    marginBottom: spacing.lg,
  },
  sourceText: {
    color: colors.navy,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: typography.weights.black,
    textAlign: "center",
  },
  targetText: {
    color: colors.textMuted,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: typography.weights.bold,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  metaText: {
    color: colors.green,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: typography.weights.medium,
    textAlign: "center",
    textTransform: "capitalize",
    marginTop: spacing.sm,
  },
  favoriteButton: {
    minHeight: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.orange,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  favoriteButtonActive: {
    borderColor: colors.orange,
    backgroundColor: colors.orange,
  },
  favoriteButtonDisabled: {
    opacity: 0.56,
  },
  favoriteButtonText: {
    color: colors.orange,
    fontSize: 14,
    fontWeight: typography.weights.bold,
  },
  favoriteButtonTextActive: {
    color: colors.white,
  },
  notice: {
    color: colors.green,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: typography.weights.medium,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  noticeError: {
    color: colors.error,
  },
  statusCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statusTitle: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: typography.weights.black,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statusButton: {
    minHeight: 38,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  statusButtonSelected: {
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
  statusButtonDisabled: {
    opacity: 0.64,
  },
  statusButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: typography.weights.bold,
  },
  statusButtonTextSelected: {
    color: colors.white,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    padding: spacing.lg,
    gap: spacing.md,
  },
  archiveButton: {
    minHeight: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  archiveButtonDisabled: {
    opacity: 0.56,
  },
  archiveButtonText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: typography.weights.bold,
  },
  infoRow: {
    gap: spacing.xs,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: typography.weights.semibold,
  },
  infoValue: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: typography.weights.bold,
  },
  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: typography.weights.black,
  },
  exampleCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  exampleSource: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: typography.weights.bold,
  },
  exampleTarget: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: typography.weights.medium,
  },
  stateBox: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
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
});
