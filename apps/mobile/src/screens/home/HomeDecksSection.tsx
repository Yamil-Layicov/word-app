import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { type DeckSummary, useDecksQuery } from "@/entities/deck";
import { useAuthFailureRedirect } from "@/features/auth";
import { useCreateDeck } from "@/features/decks";
import { isApiError } from "@/shared/api/http-error";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

type DeckModalMode = "actions" | "reset" | "export" | "delete" | null;

const EMPTY_DECKS: DeckSummary[] = [];

export function HomeDecksSection() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [isCreateDeckModalVisible, setCreateDeckModalVisible] = useState(false);
  const [deckModalMode, setDeckModalMode] = useState<DeckModalMode>(null);
  const [selectedDeck, setSelectedDeck] = useState<DeckSummary | null>(null);
  const decksQuery = useDecksQuery();
  const createDeckMutation = useCreateDeck();
  const hasUnauthorizedError = useAuthFailureRedirect(
    decksQuery.error ?? createDeckMutation.error,
  );
  const decks = decksQuery.data?.items ?? EMPTY_DECKS;
  const hasActiveSearch = searchText.trim().length > 0;
  const filteredDecks = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    if (!search) {
      return decks;
    }

    return decks.filter((deck) => deck.title.toLowerCase().includes(search));
  }, [decks, searchText]);

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
          accessibilityLabel="Create deck"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.addDeckButton,
            pressed ? styles.pressed : null,
          ]}
          onPress={() => setCreateDeckModalVisible(true)}
        >
          <Ionicons name="add" size={26} color={colors.white} />
        </Pressable>
      </View>

      {decksQuery.isLoading ? <StateCard title="Loading decks..." /> : null}

      {decksQuery.isError && !hasUnauthorizedError ? (
        <StateCard
          title="Could not load your decks."
          actionTitle="Try again"
          onAction={() => void decksQuery.refetch()}
        />
      ) : null}

      {!decksQuery.isLoading && !decksQuery.isError && filteredDecks.length === 0 ? (
        <StateCard
          title={hasActiveSearch ? "No decks match this search." : "No decks created yet."}
          actionTitle={hasActiveSearch ? "Clear search" : "Create deck"}
          onAction={() => {
            if (hasActiveSearch) {
              setSearchText("");
              return;
            }

            setCreateDeckModalVisible(true);
          }}
        />
      ) : null}

      {filteredDecks.length > 0 ? (
        <View style={styles.cardList}>
          {filteredDecks.map((deck) => (
            <HomeDeckCard
              key={deck.id}
              deck={deck}
              onPress={() =>
                router.push({
                  pathname: "/decks/category/[deckId]",
                  params: { deckId: deck.id },
                })
              }
              onPlayPress={() => {
                setSelectedDeck(deck);
                setDeckModalMode("actions");
              }}
            />
          ))}
        </View>
      ) : null}

      <DeckActionModals
        mode={deckModalMode}
        wordCount={selectedDeck?.wordCount ?? 0}
        onClose={() => setDeckModalMode(null)}
        onModeChange={setDeckModalMode}
      />
      <CreateDeckModal
        error={createDeckMutation.error}
        loading={createDeckMutation.isPending}
        visible={isCreateDeckModalVisible}
        onClose={() => setCreateDeckModalVisible(false)}
        onCreate={async (input) => {
          const deck = await createDeckMutation.mutateAsync(input);
          setCreateDeckModalVisible(false);
          router.push({
            pathname: "/decks/category/[deckId]",
            params: { deckId: deck.id },
          });
        }}
      />
    </View>
  );
}

type HomeDeckCardProps = {
  deck: DeckSummary;
  onPlayPress: () => void;
  onPress: () => void;
};

function HomeDeckCard({ deck, onPlayPress, onPress }: HomeDeckCardProps) {
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.cardContent, pressed ? styles.pressed : null]}
        onPress={onPress}
      >
        <Text numberOfLines={1} style={styles.cardTitle}>
          {deck.title}
        </Text>
        <Text numberOfLines={1} style={styles.cardMeta}>
          {deck.wordCount} {deck.wordCount === 1 ? "word" : "words"}
          {deck.isDefault ? " - Default" : ""}
        </Text> 
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${deck.progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>{deck.progressPercent}%</Text>
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

type CreateDeckModalProps = {
  error: unknown;
  loading: boolean;
  onClose: () => void;
  onCreate: (input: { description?: string; isDefault?: boolean; title: string }) => Promise<void>;
  visible: boolean;
};

function CreateDeckModal({ error, loading, onClose, onCreate, visible }: CreateDeckModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleCreate = async () => {
    const nextTitle = title.trim();
    const nextDescription = description.trim();

    if (!nextTitle) {
      setLocalError("Deck name is required.");
      return;
    }

    if (nextTitle.length > 80) {
      setLocalError("Deck name must be 80 characters or fewer.");
      return;
    }

    setLocalError(null);

    await onCreate({
      title: nextTitle,
      ...(nextDescription ? { description: nextDescription } : {}),
      isDefault,
    });

    setTitle("");
    setDescription("");
    setIsDefault(false);
  };

  const errorText = localError ?? (isApiError(error) ? error.message : null);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.createDeckCard}>
          <TextInput
            autoCapitalize="words"
            maxLength={80}
            placeholder="Deck name"
            placeholderTextColor="#9CA2B0"
            selectionColor={colors.orange}
            style={styles.createDeckInput}
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              setLocalError(null);
            }}
          />

          <View style={styles.createDeckUnderline} />

          <TextInput
            maxLength={240}
            placeholder="Description"
            placeholderTextColor="#9CA2B0"
            selectionColor={colors.orange}
            style={styles.createDeckDescription}
            value={description}
            onChangeText={setDescription}
          />

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isDefault }}
            style={({ pressed }) => [styles.defaultCategoryRow, pressed ? styles.pressed : null]}
            onPress={() => setIsDefault((value) => !value)}
          >
            <View style={[styles.defaultCheckbox, isDefault ? styles.defaultCheckboxChecked : null]}>
              {isDefault ? <Ionicons name="checkmark" size={18} color={colors.white} /> : null}
            </View>
            <Text style={styles.defaultCategoryText}>Default category</Text>
          </Pressable>

          {errorText ? <Text style={styles.createDeckError}>{errorText}</Text> : null}

          <View style={styles.createDeckActions}>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              style={({ pressed }) => [
                styles.createDeckActionButton,
                styles.createDeckCancelButton,
                pressed ? styles.pressed : null,
              ]}
              onPress={onClose}
            >
              <Text style={styles.createDeckCancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={loading}
              style={({ pressed }) => [
                styles.createDeckActionButton,
                styles.createDeckSubmitButton,
                loading ? styles.actionButtonDisabled : null,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => {
                void handleCreate();
              }}
            >
              <Text style={styles.createDeckSubmitText}>{loading ? "Creating..." : "Create"}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

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
  addDeckButton: {
    width: 54,
    minHeight: 54,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.orange,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
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
  createDeckCard: {
    width: "100%",
    maxWidth: 330,
    borderRadius: 22,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  createDeckInput: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: typography.weights.regular,
    paddingVertical: spacing.sm,
  },
  createDeckUnderline: {
    height: 1,
    backgroundColor: "#A9AEB8",
    marginBottom: spacing.md,
  },
  createDeckDescription: {
    minHeight: 42,
    color: colors.text,
    fontSize: 15,
    fontWeight: typography.weights.medium,
    paddingVertical: spacing.sm,
  },
  defaultCategoryRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  defaultCheckbox: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: "#969CAE",
    alignItems: "center",
    justifyContent: "center",
  },
  defaultCheckboxChecked: {
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
  defaultCategoryText: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: typography.weights.medium,
  },
  createDeckError: {
    color: colors.error,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.bold,
    marginTop: spacing.sm,
  },
  createDeckActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  createDeckActionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  createDeckCancelButton: {
    borderWidth: 2,
    borderColor: colors.orange,
    backgroundColor: "transparent",
  },
  createDeckSubmitButton: {
    backgroundColor: colors.orange,
  },
  createDeckCancelText: {
    color: colors.orange,
    fontSize: 17,
    fontWeight: typography.weights.black,
  },
  createDeckSubmitText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: typography.weights.black,
  },
  actionButtonDisabled: {
    opacity: 0.56,
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
