import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { PracticeSessionMode } from "@/features/practice";
import { colors, radii, spacing, typography } from "@/shared/theme";

export type PracticeAnswerResult = "CORRECT" | "INCORRECT";
export type PromptPracticeMode = Exclude<PracticeSessionMode, "MATCHING">;

type PracticePromptItem = {
  sourceText: string;
  targetText: string;
};

type ReviewSessionPromptProps = {
  choiceOptions: string[];
  item: PracticePromptItem;
  mode: PromptPracticeMode;
  onAnswer: (result: PracticeAnswerResult) => void;
};

export function ReviewSessionPrompt({
  choiceOptions,
  item,
  mode,
  onAnswer,
}: ReviewSessionPromptProps) {
  const [answerVisible, setAnswerVisible] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Translate</Text>
      <Text style={styles.sourceText}>{item.sourceText}</Text>

      {mode === "FLASHCARD" ? (
        <FlashcardPrompt
          answerVisible={answerVisible}
          targetText={item.targetText}
          onAnswer={onAnswer}
          onReveal={() => setAnswerVisible(true)}
        />
      ) : null}

      {mode === "TYPING" ? (
        <WritingPrompt
          targetText={item.targetText}
          value={typedAnswer}
          onChangeText={setTypedAnswer}
          onAnswer={onAnswer}
        />
      ) : null}

      {mode === "MULTIPLE_CHOICE" ? (
        <MultipleChoicePrompt
          options={choiceOptions}
          targetText={item.targetText}
          onAnswer={onAnswer}
        />
      ) : null}
    </View>
  );
}

type FlashcardPromptProps = {
  answerVisible: boolean;
  onAnswer: (result: PracticeAnswerResult) => void;
  onReveal: () => void;
  targetText: string;
};

function FlashcardPrompt({
  answerVisible,
  onAnswer,
  onReveal,
  targetText,
}: FlashcardPromptProps) {
  if (!answerVisible) {
    return (
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.primaryAction,
          pressed ? styles.pressed : null,
        ]}
        onPress={onReveal}
      >
        <Ionicons name="eye-outline" size={18} color={colors.white} />
        <Text style={styles.primaryActionText}>Show answer</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.answerBlock}>
      <Text style={styles.answerLabel}>Answer</Text>
      <Text style={styles.targetText}>{targetText}</Text>
      <View style={styles.gradeActions}>
        <GradeButton
          icon="close-circle-outline"
          label="Didn't know"
          tone="danger"
          onPress={() => onAnswer("INCORRECT")}
        />
        <GradeButton
          icon="checkmark-circle-outline"
          label="Knew it"
          tone="success"
          onPress={() => onAnswer("CORRECT")}
        />
      </View>
    </View>
  );
}

type WritingPromptProps = {
  onAnswer: (result: PracticeAnswerResult) => void;
  onChangeText: (value: string) => void;
  targetText: string;
  value: string;
};

function WritingPrompt({
  onAnswer,
  onChangeText,
  targetText,
  value,
}: WritingPromptProps) {
  const submitAnswer = () => {
    if (!value.trim()) {
      return;
    }

    onAnswer(
      normalizeAnswer(value) === normalizeAnswer(targetText)
        ? "CORRECT"
        : "INCORRECT",
    );
  };

  return (
    <View style={styles.inputBlock}>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Type the translation"
        placeholderTextColor={colors.textMuted}
        returnKeyType="done"
        selectionColor={colors.orange}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={submitAnswer}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !value.trim() }}
        disabled={!value.trim()}
        style={({ pressed }) => [
          styles.primaryAction,
          !value.trim() ? styles.disabled : null,
          pressed ? styles.pressed : null,
        ]}
        onPress={submitAnswer}
      >
        <Text style={styles.primaryActionText}>Check</Text>
      </Pressable>
    </View>
  );
}

type MultipleChoicePromptProps = {
  onAnswer: (result: PracticeAnswerResult) => void;
  options: string[];
  targetText: string;
};

function MultipleChoicePrompt({
  onAnswer,
  options,
  targetText,
}: MultipleChoicePromptProps) {
  return (
    <View style={styles.choiceList}>
      {options.map((option) => (
        <Pressable
          key={option}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.choice,
            pressed ? styles.pressed : null,
          ]}
          onPress={() =>
            onAnswer(option === targetText ? "CORRECT" : "INCORRECT")
          }
        >
          <Text style={styles.choiceText}>{option}</Text>
        </Pressable>
      ))}
    </View>
  );
}

type GradeButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone: "danger" | "success";
};

function GradeButton({ icon, label, onPress, tone }: GradeButtonProps) {
  const color = tone === "danger" ? colors.error : colors.green;

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.gradeButton,
        tone === "danger"
          ? styles.gradeButtonDanger
          : styles.gradeButtonSuccess,
        pressed ? styles.pressed : null,
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.gradeButtonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function normalizeAnswer(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.xl,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: typography.weights.black,
    textTransform: "uppercase",
    textAlign: "center",
  },
  sourceText: {
    color: colors.navy,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: typography.weights.black,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  answerBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
  },
  answerLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: typography.weights.black,
    textTransform: "uppercase",
    textAlign: "center",
  },
  targetText: {
    color: colors.green,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: typography.weights.bold,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  inputBlock: {
    gap: spacing.md,
  },
  input: {
    minHeight: 58,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundSoft,
    color: colors.text,
    fontSize: 17,
    fontWeight: typography.weights.semibold,
    paddingHorizontal: spacing.lg,
  },
  primaryAction: {
    minHeight: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.orange,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  primaryActionText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: typography.weights.black,
  },
  gradeActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  gradeButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  gradeButtonDanger: {
    borderColor: "#F0B8B0",
    backgroundColor: "#FFF1F1",
  },
  gradeButtonSuccess: {
    borderColor: "#DCECC3",
    backgroundColor: "#F4FAE9",
  },
  gradeButtonText: {
    fontSize: 12,
    fontWeight: typography.weights.black,
  },
  choiceList: {
    gap: spacing.sm,
  },
  choice: {
    minHeight: 50,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  choiceText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: typography.weights.bold,
    textAlign: "center",
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
  },
});
