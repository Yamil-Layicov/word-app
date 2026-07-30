import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useLogout } from "@/features/auth";
import { colors, radii, spacing, typography } from "@/shared/theme";

export function ProfileLogoutSection() {
  const logout = useLogout();
  const router = useRouter();
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const openConfirmation = () => {
    setLogoutError(null);
    setIsConfirmationVisible(true);
  };

  const closeConfirmation = () => {
    if (!isLoggingOut) {
      setIsConfirmationVisible(false);
      setLogoutError(null);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    setLogoutError(null);

    try {
      await logout();
      router.replace("/login");
    } catch {
      setLogoutError("Could not log out. Please try again.");
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <View style={styles.section}>
        <Pressable
          accessibilityLabel="Log out"
          accessibilityRole="button"
          style={({ pressed }) => [styles.logoutRow, pressed ? styles.pressed : null]}
          onPress={openConfirmation}
        >
          <View style={styles.iconShell}>
            <Ionicons name="log-out-outline" size={21} color={colors.error} />
          </View>
          <Text style={styles.logoutText}>Log out</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isConfirmationVisible}
        onRequestClose={closeConfirmation}
      >
        <Pressable style={styles.overlay} onPress={closeConfirmation}>
          <Pressable
            accessibilityViewIsModal
            style={styles.modalCard}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalIcon}>
              <Ionicons name="log-out-outline" size={23} color={colors.error} />
            </View>
            <Text style={styles.modalTitle}>Log out?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to log out of this device?
            </Text>

            {logoutError ? <Text style={styles.errorText}>{logoutError}</Text> : null}

            <View style={styles.actions}>
              <Pressable
                accessibilityLabel="Cancel log out"
                accessibilityRole="button"
                accessibilityState={{ disabled: isLoggingOut }}
                disabled={isLoggingOut}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.cancelButton,
                  pressed ? styles.pressed : null,
                ]}
                onPress={closeConfirmation}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Confirm log out"
                accessibilityRole="button"
                accessibilityState={{ disabled: isLoggingOut }}
                disabled={isLoggingOut}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.confirmButton,
                  isLoggingOut ? styles.disabled : null,
                  pressed ? styles.pressed : null,
                ]}
                onPress={() => {
                  void handleLogout();
                }}
              >
                {isLoggingOut ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.confirmText}>Log out</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logoutRow: {
    minHeight: 58,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  iconShell: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1EC",
  },
  logoutText: {
    flex: 1,
    color: colors.error,
    fontSize: 15,
    fontWeight: typography.weights.bold,
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8, 18, 28, 0.46)",
    padding: spacing.xl,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    alignItems: "center",
    padding: spacing.xl,
  },
  modalIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1EC",
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: colors.navy,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: typography.weights.black,
    textAlign: "center",
  },
  modalMessage: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: typography.weights.medium,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.semibold,
    textAlign: "center",
    marginTop: spacing.md,
  },
  actions: {
    width: "100%",
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
  },
  confirmButton: {
    backgroundColor: colors.error,
  },
  cancelText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: typography.weights.bold,
  },
  confirmText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: typography.weights.bold,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.54,
  },
});
