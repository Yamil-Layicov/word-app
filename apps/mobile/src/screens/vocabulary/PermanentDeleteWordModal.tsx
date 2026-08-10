import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "@/shared/theme";

type PermanentDeleteWordModalProps = {
  errorMessage?: string | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  sourceText: string;
  visible: boolean;
};

export function PermanentDeleteWordModal({
  errorMessage,
  loading,
  onCancel,
  onConfirm,
  sourceText,
  visible,
}: PermanentDeleteWordModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={loading ? () => undefined : onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Delete word permanently?</Text>
          <Text style={styles.message}>
            {`"${sourceText}" will be removed from My Vocabulary, every deck and collection, review boxes, learning progress and history.`}
          </Text>
          <Text style={styles.warning}>This action cannot be undone.</Text>
          {errorMessage ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {errorMessage}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: loading }}
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed ? styles.pressed : null,
              ]}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: loading }}
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                styles.deleteButton,
                loading ? styles.disabled : null,
                pressed ? styles.pressed : null,
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.deleteText}>
                {loading ? "Deleting..." : "Delete permanently"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8, 18, 28, 0.48)",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing.xl,
  },
  title: {
    color: colors.navy,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: typography.weights.black,
  },
  message: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: typography.weights.medium,
    marginTop: spacing.sm,
  },
  warning: {
    color: colors.error,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.bold,
    marginTop: spacing.md,
  },
  error: {
    color: colors.error,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.bold,
    marginTop: spacing.md,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  button: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  deleteButton: {
    backgroundColor: "#C93439",
  },
  cancelText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: typography.weights.black,
  },
  deleteText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: typography.weights.black,
    textAlign: "center",
  },
  disabled: {
    opacity: 0.56,
  },
  pressed: {
    opacity: 0.72,
  },
});
