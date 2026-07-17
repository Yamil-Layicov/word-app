import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { VocabularyItem } from "@/entities/vocabulary-item";
import { colors, radii, spacing, typography } from "@/shared/theme";

type ScheduledWordPreview = {
  intervalLabel: string;
};

type VocabularyWordRowProps = {
  concealTranslation?: boolean;
  item: VocabularyItem;
  selected?: boolean;
  selectionMode?: boolean;
  scheduledWord?: ScheduledWordPreview;
  showScheduledOverlay?: boolean;
  onMenuPress?: () => void;
  onPress: () => void;
};

export function VocabularyWordRow({
  concealTranslation = false,
  item,
  selected = false,
  selectionMode = false,
  scheduledWord,
  showScheduledOverlay = false,
  onMenuPress,
  onPress,
}: VocabularyWordRowProps) {
  const masteryStep = getEstimatedMasteryStep(item);
  const repeatCount = item.userWord.reviewCount;
  const masteryPercent = (masteryStep / 5) * 100;
  const isScheduled = Boolean(scheduledWord && showScheduledOverlay);

  return (
    <View style={[styles.row, isScheduled ? styles.rowScheduled : null]}>
      <View
        style={styles.repeatColumn}
        accessibilityLabel={`${repeatCount} reviews completed`}
      >
        <Text style={styles.repeatCount}>{repeatCount}</Text>
        <View style={styles.masteryTrack}>
          <View
            style={[styles.masteryFill, { height: `${masteryPercent}%` }]}
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.rowContent,
          pressed ? styles.pressed : null,
        ]}
        onPress={onPress}
      >
        <View
          style={[
            styles.wordColumns,
            isScheduled ? styles.wordColumnsScheduled : null,
          ]}
        >
          <View style={styles.wordColumn}>
            <View style={styles.wordLine}>
              <Text
                numberOfLines={1}
                style={[
                  styles.sourceText,
                  isScheduled ? styles.scheduledWordText : null,
                ]}
              >
                {item.sourceText}
              </Text>
              {item.userWord.isFavorite ? (
                <Ionicons name="star" size={14} color={colors.orange} />
              ) : null}
            </View>
          </View>

          <Pressable
            accessibilityLabel={`Play ${item.sourceText}`}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Ionicons
              name="volume-medium-outline"
              size={25}
              color={colors.textMuted}
            />
          </Pressable>

          <View style={styles.translationColumn}>
            {concealTranslation ? (
              <View style={styles.concealedTranslation}>
                <Ionicons
                  name="eye-off-outline"
                  size={15}
                  color={colors.textMuted}
                />
                <Text style={styles.concealedTranslationText}>Hidden</Text>
              </View>
            ) : (
              <Text
                numberOfLines={1}
                style={[
                  styles.targetText,
                  isScheduled ? styles.scheduledWordText : null,
                ]}
              >
                {item.targetText}
              </Text>
            )}
          </View>

          {!concealTranslation ? (
            <Pressable
              accessibilityLabel={`Play ${item.targetText}`}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Ionicons
                name="volume-medium-outline"
                size={25}
                color={colors.textMuted}
              />
            </Pressable>
          ) : null}
        </View>

        {isScheduled && scheduledWord ? (
          <View pointerEvents="none" style={styles.scheduledOverlay}>
            <View style={styles.scheduledOverlayBadge}>
              <Ionicons
                name="lock-closed-outline"
                size={13}
                color={colors.green}
              />
              <Text style={styles.scheduledOverlayText}>
                In {scheduledWord.intervalLabel} box
              </Text>
            </View>
          </View>
        ) : null}
      </Pressable>

      {selectionMode ? (
        <View
          accessibilityLabel={`${item.sourceText} ${
            selected ? "selected" : "not selected"
          }`}
          style={[
            styles.selectionIndicator,
            selected ? styles.selectionIndicatorSelected : null,
          ]}
        >
          {selected ? (
            <Ionicons name="checkmark" size={17} color={colors.white} />
          ) : null}
        </View>
      ) : onMenuPress ? (
        <Pressable
          accessibilityLabel={`Open actions for ${item.sourceText}`}
          accessibilityRole="button"
          hitSlop={10}
          style={({ pressed }) => [
            styles.menuButton,
            pressed ? styles.pressed : null,
          ]}
          onPress={onMenuPress}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={20}
            color={colors.textMuted}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

export function getEstimatedMasteryStep(item: VocabularyItem) {
  if (typeof item.userWord.masteryStep === "number") {
    return Math.min(5, Math.max(0, item.userWord.masteryStep));
  }

  if (item.userWord.status === "MASTERED") {
    return 5;
  }

  if (item.userWord.status === "NEW") {
    return 0;
  }

  return Math.min(
    4,
    Math.max(1, item.userWord.correctCount || item.userWord.reviewCount || 1),
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 76,
    borderTopWidth: 1,
    borderTopColor: "#F0E8DE",
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  rowScheduled: {
    backgroundColor: "#FFFDF9",
  },
  repeatColumn: {
    width: 18,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  repeatCount: {
    color: "#A9B0BA",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: typography.weights.medium,
    marginBottom: 3,
  },
  masteryTrack: {
    width: 5,
    flex: 1,
    borderRadius: radii.pill,
    backgroundColor: "#EEF4E5",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  masteryFill: {
    width: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.green,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
    position: "relative",
  },
  wordColumns: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  wordColumnsScheduled: {
    opacity: 0.14,
  },
  wordColumn: {
    flex: 1,
    minWidth: 0,
  },
  translationColumn: {
    flex: 1,
    minWidth: 0,
  },
  wordLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  sourceText: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: typography.weights.regular,
  },
  targetText: {
    color: colors.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: typography.weights.regular,
  },
  concealedTranslation: {
    minHeight: 34,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  concealedTranslationText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
  scheduledWordText: {
    color: colors.textMuted,
  },
  scheduledOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scheduledOverlayBadge: {
    minHeight: 30,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "#DCECC3",
    backgroundColor: "#F4FAE9",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  scheduledOverlayText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: typography.weights.black,
  },
  menuButton: {
    width: 30,
    height: 42,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 3,
  },
  selectionIndicatorSelected: {
    borderColor: colors.orange,
    backgroundColor: colors.orange,
  },
  pressed: {
    opacity: 0.72,
  },
});
