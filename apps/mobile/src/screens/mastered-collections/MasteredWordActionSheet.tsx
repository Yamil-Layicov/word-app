import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "@/shared/theme";

type MasteredWordActionSheetProps = {
  disabled: boolean;
  onAddToCollection?: () => void;
  onClose: () => void;
  onRemoveFromCollection?: () => void;
  onReviewLater: () => void;
  title: string;
  visible: boolean;
};

export function MasteredWordActionSheet({
  disabled,
  onAddToCollection,
  onClose,
  onRemoveFromCollection,
  onReviewLater,
  title,
  visible,
}: MasteredWordActionSheetProps) {
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
          <Text style={styles.subtitle}>Choose what to do with this word.</Text>

          {onAddToCollection ? (
            <ActionRow
              disabled={disabled}
              icon="folder-open-outline"
              label="Add to collection"
              onPress={onAddToCollection}
            />
          ) : null}
          <ActionRow
            disabled={disabled}
            icon="time-outline"
            label="Review later"
            onPress={onReviewLater}
          />
          {onRemoveFromCollection ? (
            <ActionRow
              danger
              disabled={disabled}
              icon="trash-outline"
              label="Remove from collection"
              onPress={onRemoveFromCollection}
            />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type ActionRowProps = {
  danger?: boolean;
  disabled: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

function ActionRow({
  danger = false,
  disabled,
  icon,
  label,
  onPress,
}: ActionRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionRow,
        danger ? styles.dangerRow : null,
        pressed ? styles.pressed : null,
      ]}
      onPress={onPress}
    >
      <View style={[styles.actionIcon, danger ? styles.dangerIcon : null]}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? colors.error : colors.navy}
        />
      </View>
      <Text style={[styles.actionText, danger ? styles.dangerText : null]}>
        {label}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={danger ? colors.error : colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(8, 18, 28, 0.42)",
  },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
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
  actionRow: {
    minHeight: 54,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  dangerRow: {
    borderColor: "#F0B8B0",
    backgroundColor: "#FFF1F1",
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerIcon: {
    backgroundColor: "#FFE7E7",
  },
  actionText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: typography.weights.bold,
  },
  dangerText: {
    color: colors.error,
  },
  pressed: {
    opacity: 0.72,
  },
});
