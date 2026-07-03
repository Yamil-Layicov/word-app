import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  type VocabularyItem,
  useVocabularyItemsQuery,
} from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

const HOME_DECK_PREVIEW_LIMIT = 20;

type DeckModalMode = "actions" | "reset" | "export" | "delete" | null;

export function HomeDecksSection() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [deckModalMode, setDeckModalMode] = useState<DeckModalMode>(null);
  const vocabularyFilters = useMemo(() => {
    const search = searchText.trim();

    return {
      limit: HOME_DECK_PREVIEW_LIMIT,
      ...(search ? { search } : {}),
      ...(favoritesOnly ? { isFavorite: true } : {}),
    };
  }, [favoritesOnly, searchText]);
  const vocabularyQuery = useVocabularyItemsQuery(vocabularyFilters);
  const hasUnauthorizedError = useAuthFailureRedirect(vocabularyQuery.error);
  const items = vocabularyQuery.data?.items ?? [];
  const hasActiveSearch = searchText.trim().length > 0;
  const hasActiveCriteria = hasActiveSearch || favoritesOnly;

  return (
    <View style={styles.section}>
      <View style={styles.searchRow}>
        <View style={styles.searchShell}>
          <Ionicons name="search-outline" size={21} color={colors.textMuted} />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Search decks or words..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            selectionColor={colors.orange}
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
          />
          {hasActiveSearch ? (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          accessibilityLabel="Filter favorites"
          accessibilityRole="button"
          accessibilityState={{ selected: favoritesOnly }}
          style={({ pressed }) => [
            styles.filterButton,
            favoritesOnly ? styles.filterButtonActive : null,
            pressed ? styles.pressed : null,
          ]}
          onPress={() => setFavoritesOnly((value) => !value)}
        >
          <Ionicons
            name={favoritesOnly ? "star" : "filter-outline"}
            size={22}
            color={favoritesOnly ? colors.white : colors.navy}
          />
        </Pressable>
      </View>

      {vocabularyQuery.isLoading ? <StateCard title="Loading decks..." /> : null}

      {vocabularyQuery.isError && !hasUnauthorizedError ? (
        <StateCard
          title="Could not load your words."
          actionTitle="Try again"
          onAction={() => void vocabularyQuery.refetch()}
        />
      ) : null}

      {!vocabularyQuery.isLoading && !vocabularyQuery.isError && items.length === 0 ? (
        <StateCard
          title={hasActiveCriteria ? "No words match this search." : "No words added yet."}
          actionTitle={hasActiveCriteria ? "Clear filters" : "Add word"}
          onAction={() => {
            if (hasActiveCriteria) {
              setSearchText("");
              setFavoritesOnly(false);
              return;
            }

            router.push("/vocabulary/create");
          }}
        />
      ) : null}

      {items.length > 0 ? (
        <View style={styles.cardList}>
          <HomeDeckCard
            items={items}
            title={hasActiveCriteria ? "Filtered words" : "My Vocabulary"}
            onPress={() => router.push("/vocabulary")}
            onPlayPress={() => setDeckModalMode("actions")}
          />
        </View>
      ) : null}

      <DeckActionModals
        mode={deckModalMode}
        wordCount={items.length}
        onClose={() => setDeckModalMode(null)}
        onModeChange={setDeckModalMode}
      />
    </View>
  );
}

type HomeDeckCardProps = {
  items: VocabularyItem[];
  onPlayPress: () => void;
  onPress: () => void;
  title: string;
};

function HomeDeckCard({ items, onPlayPress, onPress, title }: HomeDeckCardProps) {
  const progress = getDeckProgressPercent(items);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.cardContent, pressed ? styles.pressed : null]}
        onPress={onPress}
      >
        <Text numberOfLines={1} style={styles.cardTitle}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.cardMeta}>
          {items.length} words
        </Text> 
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityLabel="Open game picker"
        accessibilityRole="button"
        style={({ pressed }) => [styles.playButton, pressed ? styles.pressed : null]}
        onPress={onPlayPress}
      >
        <Ionicons name="play" size={18} color={colors.green} />
      </Pressable>
    </View>
  );
}

type DeckActionModalsProps = {
  mode: DeckModalMode;
  onClose: () => void;
  onModeChange: (mode: DeckModalMode) => void;
  wordCount: number;
};

function DeckActionModals({ mode, onClose, onModeChange, wordCount }: DeckActionModalsProps) {
  const [dontShowExportAgain, setDontShowExportAgain] = useState(false);

  if (!mode) {
    return null;
  }

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      {mode === "actions" ? (
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable style={styles.gamePickerLayer} onPress={() => undefined}>
            <View style={styles.gamePickerCard}>
              <GameOption
                icon="play-circle-outline"
                title="Learn"
                subtitle="no words to learn"
                muted
              />
              <GameOption
                accent="orange"
                icon="sync-outline"
                title="Repeat"
                subtitle={`Repeat ${wordCount} ${wordCount === 1 ? "word" : "words"}`}
              />
              <GameOption icon="albums-outline" title="Review words" />
              <GameOption
                icon="ticket-outline"
                title="One game"
                subtitle={`Left ${wordCount} ${wordCount === 1 ? "word" : "words"}`}
              />
              <GameOption icon="phone-portrait-outline" title="Autoplay" showProgress />
            </View>

            <View style={styles.quickActionsRow}>
              <RoundToolButton
                accessibilityLabel="Reset statistic"
                icon="refresh-outline"
                onPress={() => onModeChange("reset")}
              />
              <RoundToolButton
                accessibilityLabel="Export to file"
                icon="share-outline"
                onPress={() => onModeChange("export")}
              />
              <RoundToolButton
                accessibilityLabel="Delete words"
                icon="trash-outline"
                onPress={() => onModeChange("delete")}
              />
            </View>
          </Pressable>
        </Pressable>
      ) : null}

      {mode === "reset" ? (
        <ConfirmDialog
          confirmTone="orange"
          message="Are you sure you want to reset statistic for 1 category?"
          title="Reset statistic"
          onCancel={() => onModeChange("actions")}
          onConfirm={onClose}
        />
      ) : null}

      {mode === "delete" ? (
        <ConfirmDialog
          confirmTone="danger"
          message={`Are you sure you want to delete ${wordCount} ${wordCount === 1 ? "word" : "words"}?`}
          title="Delete words"
          onCancel={() => onModeChange("actions")}
          onConfirm={onClose}
        />
      ) : null}

      {mode === "export" ? (
        <ExportDialog
          checked={dontShowExportAgain}
          onClose={() => onModeChange("actions")}
          onConfirm={onClose}
          onToggleChecked={() => setDontShowExportAgain((value) => !value)}
        />
      ) : null}
    </Modal>
  );
}

type GameOptionProps = {
  accent?: "orange";
  icon: keyof typeof Ionicons.glyphMap;
  muted?: boolean;
  showProgress?: boolean;
  subtitle?: string;
  title: string;
};

function GameOption({ accent, icon, muted = false, showProgress = false, subtitle, title }: GameOptionProps) {
  const iconColor = muted ? "#C9CED8" : accent === "orange" ? "#E59B00" : "#969CAE";

  return (
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.gameOption, pressed ? styles.pressed : null]}>
      <View style={styles.gameOptionIconBox}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.gameOptionBody}>
        <Text style={styles.gameOptionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.gameOptionSubtitle}>{subtitle}</Text> : null}
        {showProgress ? <View style={styles.autoplayLine} /> : null}
      </View>
    </Pressable>
  );
}

type RoundToolButtonProps = {
  accessibilityLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function RoundToolButton({ accessibilityLabel, icon, onPress }: RoundToolButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={({ pressed }) => [styles.roundToolButton, pressed ? styles.pressed : null]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color="#5C6375" />
    </Pressable>
  );
}

type ConfirmDialogProps = {
  confirmTone: "orange" | "danger";
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
};

function ConfirmDialog({ confirmTone, message, onCancel, onConfirm, title }: ConfirmDialogProps) {
  const isDanger = confirmTone === "danger";

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.confirmCard, isDanger ? styles.deleteConfirmCard : null]}>
        <Text style={styles.confirmTitle}>{title}</Text>
        <Text style={styles.confirmMessage}>{message}</Text>

        <View style={styles.confirmActions}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.confirmButton,
              styles.confirmButtonSecondary,
              isDanger ? styles.confirmButtonSecondaryDanger : null,
              pressed ? styles.pressed : null,
            ]}
            onPress={onCancel}
          >
            <Text style={[styles.confirmButtonSecondaryText, isDanger ? styles.confirmButtonSecondaryDangerText : null]}>
              No
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.confirmButton,
              styles.confirmButtonPrimary,
              isDanger ? styles.confirmButtonDanger : null,
              pressed ? styles.pressed : null,
            ]}
            onPress={onConfirm}
          >
            <Text style={styles.confirmButtonPrimaryText}>Yes</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type ExportDialogProps = {
  checked: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onToggleChecked: () => void;
};

function ExportDialog({ checked, onClose, onConfirm, onToggleChecked }: ExportDialogProps) {
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.exportCard}>
        <View style={styles.exportHeader}>
          <Text style={styles.exportTitle}>Export to file</Text>
          <Pressable accessibilityLabel="Close export dialog" accessibilityRole="button" hitSlop={8} onPress={onClose}>
            <Ionicons name="close-outline" size={24} color="#8E95A5" />
          </Pressable>
        </View>

        <Text style={styles.exportBodyText}>
          Select the folder, where you want to export categories.
        </Text>
        <Text style={styles.exportBodyText}>You can export in:</Text>
        <Text style={styles.exportListText}>- Lexilize file <Text style={styles.exportBoldText}>(.lxf)</Text></Text>
        <Text style={styles.exportListText}>- Excel file <Text style={styles.exportBoldText}>(.xlsx)</Text></Text>
        <Text style={styles.exportBodyText}>
          Lexilize format (.lxf) will be used as the main format.
        </Text>
        <Text style={styles.exportBodyText}>
          With Lexilize format you can import/export categories with images.
        </Text>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          style={({ pressed }) => [styles.exportCheckboxRow, pressed ? styles.pressed : null]}
          onPress={onToggleChecked}
        >
          <View style={[styles.exportCheckbox, checked ? styles.exportCheckboxChecked : null]}>
            {checked ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
          </View>
          <Text style={styles.exportCheckboxText}>{"Don't show anymore"}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.exportOkButton, pressed ? styles.pressed : null]}
          onPress={onConfirm}
        >
          <Text style={styles.exportOkButtonText}>OK</Text>
        </Pressable>
      </View>
    </View>
  );
}

type StateCardProps = {
  actionTitle?: string;
  onAction?: () => void;
  title: string;
};

function StateCard({ actionTitle, onAction, title }: StateCardProps) {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>{title}</Text>
      {actionTitle && onAction ? (
        <Button title={actionTitle} variant="secondary" onPress={onAction} />
      ) : null}
    </View>
  );
}

function getDeckProgressPercent(items: VocabularyItem[]) {
  if (items.length === 0) {
    return 0;
  }

  const maxScore = items.length * 5;
  const currentScore = items.reduce((total, item) => total + getEstimatedMasteryStep(item), 0);

  return Math.round((currentScore / maxScore) * 100);
}

function getEstimatedMasteryStep(item: VocabularyItem) {
  if (item.userWord.status === "MASTERED") {
    return 5;
  }

  if (item.userWord.status === "NEW") {
    return 0;
  }

  return Math.min(4, Math.max(1, item.userWord.correctCount || item.userWord.reviewCount || 1));
}

const styles = StyleSheet.create({
  section: {
    width: "100%",
    maxWidth: 420,
    marginTop: spacing.md,
  },
  searchRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  searchShell: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 15,
    fontWeight: typography.weights.medium,
    paddingVertical: spacing.md,
  },
  filterButton: {
    width: 54,
    minHeight: 54,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    borderColor: colors.orange,
    backgroundColor: colors.orange,
  },
  cardList: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  card: {
    minHeight: 86,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: typography.weights.black,
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  progressTrack: {
    flex: 1,
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.green,
  },
  progressText: {
    minWidth: 34,
    color: colors.green,
    fontSize: 12,
    fontWeight: typography.weights.black,
    textAlign: "right",
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF7D8",
  },
  stateCard: {
    marginTop: spacing.lg,
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
    backgroundColor: "rgba(0, 0, 0, 0.58)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  gamePickerLayer: {
    width: "100%",
    alignItems: "center",
  },
  gamePickerCard: {
    width: "100%",
    maxWidth: 260,
    borderRadius: 20,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  gameOption: {
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F4",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  gameOptionIconBox: {
    width: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  gameOptionBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  gameOptionTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: typography.weights.regular,
  },
  gameOptionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typography.weights.regular,
    marginTop: spacing.xs,
  },
  autoplayLine: {
    width: "100%",
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: "#DFE2E8",
    marginTop: spacing.xs,
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 32,
    marginTop: 44,
  },
  roundToolButton: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: "#F3F4F7",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCard: {
    width: "100%",
    maxWidth: 286,
    borderRadius: 22,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  deleteConfirmCard: {
    backgroundColor: "#FFF1F1",
  },
  confirmTitle: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: typography.weights.black,
  },
  confirmMessage: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: typography.weights.regular,
    marginTop: spacing.lg,
  },
  confirmActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  confirmButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonSecondary: {
    borderWidth: 2,
    borderColor: colors.orange,
    backgroundColor: "transparent",
  },
  confirmButtonSecondaryDanger: {
    borderColor: "#C93439",
  },
  confirmButtonPrimary: {
    backgroundColor: colors.orange,
  },
  confirmButtonDanger: {
    backgroundColor: "#C93439",
  },
  confirmButtonSecondaryText: {
    color: colors.orange,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: typography.weights.black,
  },
  confirmButtonSecondaryDangerText: {
    color: "#C93439",
  },
  confirmButtonPrimaryText: {
    color: colors.white,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: typography.weights.black,
  },
  exportCard: {
    width: "100%",
    maxWidth: 306,
    borderRadius: 22,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  exportHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  exportTitle: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: typography.weights.black,
  },
  exportBodyText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: typography.weights.regular,
    marginTop: spacing.md,
  },
  exportListText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: typography.weights.regular,
    paddingLeft: spacing.md,
  },
  exportBoldText: {
    fontWeight: typography.weights.black,
  },
  exportCheckboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  exportCheckbox: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: "#A1A8B7",
    alignItems: "center",
    justifyContent: "center",
  },
  exportCheckboxChecked: {
    borderColor: colors.orange,
    backgroundColor: colors.orange,
  },
  exportCheckboxText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: typography.weights.regular,
  },
  exportOkButton: {
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  exportOkButtonText: {
    color: colors.white,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: typography.weights.black,
  },
  pressed: {
    opacity: 0.76,
  },
});
