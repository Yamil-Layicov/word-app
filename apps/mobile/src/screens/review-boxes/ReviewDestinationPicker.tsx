import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  REVIEW_INTERVALS,
  type ScheduledReviewInterval,
} from "@/features/review-boxes";
import { colors, radii, spacing, typography } from "@/shared/theme";

type ReviewDestinationPickerProps = {
  currentInterval?: ScheduledReviewInterval;
  disabled?: boolean;
  onSelect: (interval: ScheduledReviewInterval) => void;
};

export function ReviewDestinationPicker({
  currentInterval,
  disabled = false,
  onSelect,
}: ReviewDestinationPickerProps) {
  return (
    <View style={styles.options}>
      {REVIEW_INTERVALS.map((interval) => {
        const isCurrentInterval = interval.apiInterval === currentInterval;

        return (
          <Pressable
            key={interval.apiInterval}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            style={({ pressed }) => [
              styles.option,
              isCurrentInterval ? styles.currentOption : null,
              pressed ? styles.pressed : null,
            ]}
            onPress={() => onSelect(interval.apiInterval)}
          >
            <Ionicons
              name={
                interval.label.includes("hour")
                  ? "time-outline"
                  : "calendar-outline"
              }
              size={18}
              color={isCurrentInterval ? colors.orange : colors.navy}
            />
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{interval.label}</Text>
              <Text style={styles.optionSubtitle}>
                {isCurrentInterval ? "Use this box again" : interval.helperText}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: spacing.sm,
  },
  option: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  currentOption: {
    borderColor: "#FFD1B8",
    backgroundColor: colors.orangeSoft,
  },
  optionText: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: typography.weights.bold,
  },
  optionSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: typography.weights.medium,
    marginTop: 1,
  },
  pressed: {
    opacity: 0.72,
  },
});
