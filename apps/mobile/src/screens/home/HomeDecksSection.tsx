import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  type VocabularyItem,
  useVocabularyItemsQuery,
} from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

const HOME_DECK_PREVIEW_LIMIT = 20;

export function HomeDecksSection() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
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
          />
        </View>
      ) : null}
    </View>
  );
}

type HomeDeckCardProps = {
  items: VocabularyItem[];
  onPress: () => void;
  title: string;
};

function HomeDeckCard({ items, onPress, title }: HomeDeckCardProps) {
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
        onPress={() => Alert.alert("Coming soon", "Game picker modal will be added later.")}
      >
        <Ionicons name="play" size={18} color={colors.green} />
      </Pressable>
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
  pressed: {
    opacity: 0.76,
  },
});
