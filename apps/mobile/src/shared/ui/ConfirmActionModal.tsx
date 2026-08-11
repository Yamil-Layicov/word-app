import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "@/shared/theme";

type ConfirmActionModalProps = {
  confirmTitle: string;
  errorMessage?: string | null;
  loading: boolean;
  loadingTitle: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  supportingMessage?: string;
  title: string;
  tone?: "danger" | "primary";
  visible: boolean;
};

export function ConfirmActionModal({
  confirmTitle,
  errorMessage,
  loading,
  loadingTitle,
  message,
  onCancel,
  onConfirm,
  supportingMessage,
  title,
  tone = "primary",
  visible,
}: ConfirmActionModalProps) {
  const isDanger = tone === "danger";

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={loading ? () => undefined : onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {supportingMessage ? (
            <Text
              style={[
                styles.supportingMessage,
                isDanger ? styles.dangerSupportingMessage : null,
              ]}
            >
              {supportingMessage}
            </Text>
          ) : null}
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
                isDanger ? styles.dangerButton : styles.primaryButton,
                loading ? styles.disabled : null,
                pressed ? styles.pressed : null,
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>
                {loading ? loadingTitle : confirmTitle}
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
  supportingMessage: {
    color: colors.green,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.bold,
    marginTop: spacing.md,
  },
  dangerSupportingMessage: {
    color: colors.error,
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
  primaryButton: {
    backgroundColor: colors.orange,
  },
  dangerButton: {
    backgroundColor: "#C93439",
  },
  cancelText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: typography.weights.black,
  },
  confirmText: {
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
