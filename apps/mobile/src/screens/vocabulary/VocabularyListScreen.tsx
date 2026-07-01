import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  type UserWordStatus,
  type VocabularyItem,
  useInfiniteVocabularyItemsQuery,
} from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button, TextField } from "@/shared/ui";

type VisibleUserWordStatus = Exclude<UserWordStatus, "ARCHIVED">;
type VocabularyListFilter = "ALL" | "FAVORITES" | VisibleUserWordStatus;

const FILTER_OPTIONS: { label: string; value: VocabularyListFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Favorites", value: "FAVORITES" },
  { label: "New", value: "NEW" },
  { label: "Learning", value: "LEARNING" },
  { label: "Reviewing", value: "REVIEWING" },
  { label: "Mastered", value: "MASTERED" },
];

export function VocabularyListScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState<VocabularyListFilter>("ALL");
  const vocabularyFilters = useMemo(() => {
    const search = searchText.trim();

    return {
      limit: 20,
      ...(search ? { search } : {}),
      ...(activeFilter === "FAVORITES" ? { isFavorite: true } : {}),
      ...(isStatusFilter(activeFilter) ? { status: activeFilter } : {}),
    };
  }, [activeFilter, searchText]);
  const vocabularyQuery = useInfiniteVocabularyItemsQuery(vocabularyFilters);
  const hasUnauthorizedError = useAuthFailureRedirect(vocabularyQuery.error);
  const items = vocabularyQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const hasSearch = searchText.trim().length > 0;
  const hasActiveFilter = activeFilter !== "ALL";

  return (
    <ScreenContainer backgroundColor={colors.backgroundWarm} contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.orange} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.createLink}
          onPress={() => router.push("/vocabulary/create")}
        >
          <Ionicons name="add" size={18} color={colors.orange} />
          <Text style={styles.createLinkText}>Add</Text>
        </Pressable>
      </View>

      <View style={styles.header}>
        <View style={styles.iconShell}>
          <Ionicons name="library-outline" size={30} color={colors.white} />
        </View>
        <Text style={styles.title}>Vocabulary</Text>
        <Text style={styles.subtitle}>Review the words saved to your active language pair.</Text>
      </View>

      <View style={styles.searchBox}>
        <TextField
          autoCapitalize="none"
          autoCorrect={false}
          icon="search-outline"
          placeholder="Search words"
          returnKeyType="search"
          value={searchText}
          rightElement={
            hasSearch ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setSearchText("")}
              >
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            ) : null
          }
          onChangeText={setSearchText}
        />
      </View>

      <View style={styles.filterGrid}>
        {FILTER_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            selected={activeFilter === option.value}
            onPress={() => setActiveFilter(option.value)}
          />
        ))}
      </View>

      {vocabularyQuery.isLoading ? <StateBox title="Loading vocabulary..." /> : null}

      {vocabularyQuery.isError && !hasUnauthorizedError ? (
        <StateBox
          title="Could not load vocabulary."
          actionTitle="Try again"
          onAction={() => void vocabularyQuery.refetch()}
        />
      ) : null}

      {!vocabularyQuery.isLoading && !vocabularyQuery.isError && items.length === 0 ? (
        <StateBox
          title={hasSearch || hasActiveFilter ? "No words match these filters." : "No words added yet."}
        />
      ) : null}

      {items.map((item) => (
        <VocabularyRow
          key={item.id}
          item={item}
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
    </ScreenContainer>
  );
}

type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function FilterChip({ label, selected, onPress }: FilterChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.filterChip, selected ? styles.filterChipSelected : null]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, selected ? styles.filterChipTextSelected : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

type VocabularyRowProps = {
  item: VocabularyItem;
  onPress: () => void;
};

function VocabularyRow({ item, onPress }: VocabularyRowProps) {
  return (
    <Pressable accessibilityRole="button" style={styles.row} onPress={onPress}>
      <View style={styles.rowIcon}>
        <Ionicons name="book-outline" size={21} color={colors.navy} />
      </View>
      <View style={styles.rowText}>
        <View style={styles.wordLine}>
          <Text style={styles.sourceText}>{item.sourceText}</Text>
          {item.userWord.isFavorite ? (
            <Ionicons name="star" size={16} color={colors.orange} />
          ) : null}
        </View>
        <Text style={styles.targetText}>{item.targetText}</Text>
        <Text style={styles.metaText}>
          {item.wordType.replace("_", " ").toLowerCase()} - {item.cefrLevel || "No level"} -{" "}
          {item.userWord.status.toLowerCase()}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
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

function isStatusFilter(value: VocabularyListFilter): value is VisibleUserWordStatus {
  return value !== "ALL" && value !== "FAVORITES";
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
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
  createLink: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  createLinkText: {
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
  title: {
    color: colors.navy,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: typography.weights.black,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: typography.weights.medium,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  searchBox: {
    marginBottom: spacing.md,
  },
  filterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterChip: {
    minHeight: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  filterChipSelected: {
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
  filterChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: typography.weights.bold,
  },
  filterChipTextSelected: {
    color: colors.white,
  },
  row: {
    minHeight: 92,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  loadMoreButton: {
    marginTop: spacing.sm,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  wordLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sourceText: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: typography.weights.black,
  },
  targetText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
  },
  metaText: {
    color: colors.green,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: typography.weights.medium,
    marginTop: spacing.xs,
    textTransform: "capitalize",
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
