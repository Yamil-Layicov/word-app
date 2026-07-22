import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import type { PracticeSessionMode } from "@/features/practice";
import { colors, radii, spacing, typography } from "@/shared/theme";

type ReviewModePickerProps = {
  canUseMatching: boolean;
  canUseMultipleChoice: boolean;
  onClose: () => void;
  onSelect: (mode: PracticeSessionMode) => void;
  title?: string;
  visible: boolean;
  wordCount: number;
};

type ReviewModeOption = {
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  mode?: PracticeSessionMode;
};

const REVIEW_MODE_OPTIONS: ReviewModeOption[] = [
  {
    description: "Reveal the translation and grade yourself.",
    icon: "albums-outline",
    label: "Flashcards",
    mode: "FLASHCARD",
  },
  {
    description: "Type the translation from memory.",
    icon: "create-outline",
    label: "Writing",
    mode: "TYPING",
  },
  {
    description: "Choose the correct translation.",
    icon: "help-circle-outline",
    label: "Test",
    mode: "MULTIPLE_CHOICE",
  },
  {
    description: "Pair words and translations.",
    icon: "git-compare-outline",
    label: "Matching",
    mode: "MATCHING",
  },
];

export function ReviewModePicker({
  canUseMatching,
  canUseMultipleChoice,
  onClose,
  onSelect,
  title = "Choose a review mode",
  visible,
  wordCount,
}: ReviewModePickerProps) {
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
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>
                {wordCount} {wordCount === 1 ? "word" : "words"} ready
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close review mode picker"
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [
                styles.closeButton,
                pressed ? styles.pressed : null,
              ]}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.options}>
            {REVIEW_MODE_OPTIONS.map((option) => {
              const needsMoreWords =
                option.mode === "MULTIPLE_CHOICE" && !canUseMultipleChoice;
              const cannotMatch = option.mode === "MATCHING" && !canUseMatching;
              const isDisabled = needsMoreWords || cannotMatch;

              return (
                <Pressable
                  key={option.label}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isDisabled }}
                  disabled={isDisabled}
                  style={({ pressed }) => [
                    styles.option,
                    isDisabled ? styles.optionDisabled : null,
                    pressed ? styles.pressed : null,
                  ]}
                  onPress={() => {
                    if (option.mode) {
                      onSelect(option.mode);
                    }
                  }}
                >
                  <View style={styles.optionIcon}>
                    <Ionicons
                      name={option.icon}
                      size={22}
                      color={isDisabled ? colors.textMuted : colors.orange}
                    />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{option.label}</Text>
                    <Text style={styles.optionDescription}>
                      {needsMoreWords
                        ? "At least 2 different answers are required."
                        : cannotMatch
                          ? "At least 2 words with unique texts are required."
                          : option.description}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={isDisabled ? colors.borderStrong : colors.textMuted}
                  />
                </Pressable>
              );
            })}
          </View>
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
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
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
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    minHeight: 72,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionDisabled: {
    opacity: 0.54,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: typography.weights.black,
  },
  optionDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.72,
  },
});
