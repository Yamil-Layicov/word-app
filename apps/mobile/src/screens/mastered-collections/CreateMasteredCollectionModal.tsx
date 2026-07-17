import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { CreateMasteredCollectionRequest } from "@/entities/mastered-collection";
import { isApiError } from "@/shared/api/http-error";
import { colors, radii, spacing, typography } from "@/shared/theme";

type CreateMasteredCollectionModalProps = {
  error: unknown;
  loading: boolean;
  onClose: () => void;
  onCreate: (input: CreateMasteredCollectionRequest) => Promise<boolean>;
  visible: boolean;
};

export function CreateMasteredCollectionModal({
  error,
  loading,
  onClose,
  onCreate,
  visible,
}: CreateMasteredCollectionModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const closeAndReset = () => {
    if (loading) {
      return;
    }

    setTitle("");
    setDescription("");
    setLocalError(null);
    onClose();
  };

  const handleCreate = async () => {
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();

    if (!normalizedTitle) {
      setLocalError("Collection name is required.");
      return;
    }

    if (normalizedTitle.length > 80) {
      setLocalError("Collection name must be 80 characters or fewer.");
      return;
    }

    setLocalError(null);
    const created = await onCreate({
      title: normalizedTitle,
      ...(normalizedDescription ? { description: normalizedDescription } : {}),
    });

    if (created) {
      setTitle("");
      setDescription("");
      setLocalError(null);
    }
  };

  const errorText = localError ?? (isApiError(error) ? error.message : null);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={closeAndReset}
    >
      <Pressable style={styles.overlay} onPress={closeAndReset}>
        <Pressable style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconShell}>
              <Ionicons name="folder-open" size={21} color={colors.orange} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>New collection</Text>
              <Text style={styles.subtitle}>Group words you already know.</Text>
            </View>
          </View>

          <TextInput
            autoCapitalize="words"
            maxLength={80}
            placeholder="Collection name"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.orange}
            style={styles.input}
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              setLocalError(null);
            }}
          />

          <TextInput
            maxLength={240}
            multiline
            placeholder="Description (optional)"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.orange}
            style={[styles.input, styles.descriptionInput]}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />

          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: loading }}
              disabled={loading}
              style={({ pressed }) => [
                styles.actionButton,
                styles.cancelButton,
                pressed ? styles.pressed : null,
              ]}
              onPress={closeAndReset}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: loading }}
              disabled={loading}
              style={({ pressed }) => [
                styles.actionButton,
                styles.createButton,
                loading ? styles.disabled : null,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => {
                void handleCreate();
              }}
            >
              <Text style={styles.createText}>
                {loading ? "Creating..." : "Create"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8, 18, 28, 0.42)",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  iconShell: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.navy,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: typography.weights.black,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
  input: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  descriptionInput: {
    minHeight: 82,
    paddingTop: spacing.md,
  },
  error: {
    color: colors.error,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.orange,
    backgroundColor: colors.white,
  },
  createButton: {
    backgroundColor: colors.orange,
  },
  cancelText: {
    color: colors.orange,
    fontSize: 14,
    fontWeight: typography.weights.black,
  },
  createText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: typography.weights.black,
  },
  disabled: {
    opacity: 0.54,
  },
  pressed: {
    opacity: 0.72,
  },
});
