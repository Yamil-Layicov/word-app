import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import type { ScheduledReviewInterval } from "@/features/review-boxes";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { ReviewDestinationPicker } from "./ReviewDestinationPicker";

type ScheduledWordActionSheetProps = {
  currentInterval?: ScheduledReviewInterval;
  disabled: boolean;
  onClose: () => void;
  onMove: (interval: ScheduledReviewInterval) => void;
  onRemove?: () => void;
  title: string;
  visible: boolean;
};

export function ScheduledWordActionSheet({
  currentInterval,
  disabled,
  onClose,
  onMove,
  onRemove,
  title,
  visible,
}: ScheduledWordActionSheetProps) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.handle} />
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <Text style={styles.subtitle}>
            Move it to another box. Its timer will wait for Start.
          </Text>

          {visible ? (
            <>
              <ReviewDestinationPicker
                currentInterval={currentInterval}
                disabled={disabled}
                onSelect={onMove}
              />

              {onRemove ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled }}
                  disabled={disabled}
                  style={({ pressed }) => [
                    styles.removeButton,
                    pressed ? styles.pressed : null,
                  ]}
                  onPress={onRemove}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={colors.error}
                  />
                  <Text style={styles.removeButtonText}>
                    Remove from review box
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(8, 18, 28, 0.42)",
  },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.navy,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: typography.weights.black,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typography.weights.medium,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  removeButton: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#F0B8B0",
    backgroundColor: "#FFF1F1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  removeButtonText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: typography.weights.black,
  },
  pressed: {
    opacity: 0.72,
  },
});
