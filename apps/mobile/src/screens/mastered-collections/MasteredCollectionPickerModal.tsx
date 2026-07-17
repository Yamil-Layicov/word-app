import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { MasteredCollectionSummary } from "@/entities/mastered-collection";
import { isApiError } from "@/shared/api/http-error";
import { colors, radii, spacing, typography } from "@/shared/theme";

type MasteredCollectionPickerModalProps = {
  collections: MasteredCollectionSummary[];
  error: unknown;
  loading: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  onSelect: (collectionId: string) => void;
  selectedWordCount: number;
  visible: boolean;
};

export function MasteredCollectionPickerModal({
  collections,
  error,
  loading,
  onClose,
  onCreateNew,
  onSelect,
  selectedWordCount,
  visible,
}: MasteredCollectionPickerModalProps) {
  const errorText = isApiError(error) ? error.message : null;

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
          <Text style={styles.title}>Add to collection</Text>
          <Text style={styles.subtitle}>
            {selectedWordCount}{" "}
            {selectedWordCount === 1 ? "word is" : "words are"} selected.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: loading }}
            disabled={loading}
            style={({ pressed }) => [
              styles.createRow,
              pressed ? styles.pressed : null,
            ]}
            onPress={onCreateNew}
          >
            <View style={styles.createIcon}>
              <Ionicons name="add" size={21} color={colors.orange} />
            </View>
            <Text style={styles.createText}>Create new collection</Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
            />
          </Pressable>

          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {collections.length === 0 ? (
              <Text style={styles.emptyText}>You have no collections yet.</Text>
            ) : (
              collections.map((collection) => (
                <Pressable
                  key={collection.id}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: loading }}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.collectionRow,
                    pressed ? styles.pressed : null,
                  ]}
                  onPress={() => onSelect(collection.id)}
                >
                  <View style={styles.folderIcon}>
                    <Ionicons
                      name="folder-outline"
                      size={20}
                      color={colors.green}
                    />
                  </View>
                  <View style={styles.collectionText}>
                    <Text numberOfLines={1} style={styles.collectionTitle}>
                      {collection.title}
                    </Text>
                    <Text style={styles.collectionCount}>
                      {collection.wordCount}{" "}
                      {collection.wordCount === 1 ? "word" : "words"}
                    </Text>
                  </View>
                  <Ionicons
                    name="add-circle-outline"
                    size={22}
                    color={colors.orange}
                  />
                </Pressable>
              ))
            )}
          </ScrollView>

          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
          {loading ? <Text style={styles.loading}>Adding words...</Text> : null}
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
    maxHeight: "78%",
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
  createRow: {
    minHeight: 54,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#FFD2B8",
    backgroundColor: colors.orangeSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  createIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  createText: {
    flex: 1,
    color: colors.orange,
    fontSize: 14,
    fontWeight: typography.weights.black,
  },
  list: {
    gap: spacing.sm,
  },
  collectionRow: {
    minHeight: 60,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  folderIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: "#F2F8E8",
    alignItems: "center",
    justifyContent: "center",
  },
  collectionText: {
    flex: 1,
    minWidth: 0,
  },
  collectionTitle: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: typography.weights.bold,
  },
  collectionCount: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  error: {
    color: colors.error,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.md,
  },
  loading: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: spacing.md,
  },
  pressed: {
    opacity: 0.72,
  },
});
