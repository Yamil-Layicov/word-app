import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  ScheduledReviewAnswerResult,
  ScheduledReviewInterval,
  ScheduledReviewItem,
} from "@/features/review-boxes";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { ReviewDestinationPicker } from "./ReviewDestinationPicker";

export type ScheduledReviewCompletion =
  | {
      result: "KNOWN";
    }
  | {
      result: Exclude<ScheduledReviewAnswerResult, "KNOWN">;
      nextInterval: ScheduledReviewInterval;
    };

type ScheduledReviewPromptProps = {
  disabled: boolean;
  item: ScheduledReviewItem;
  onComplete: (completion: ScheduledReviewCompletion) => void;
  onOpenWord: () => void;
};

export function ScheduledReviewPrompt({
  disabled,
  item,
  onComplete,
  onOpenWord,
}: ScheduledReviewPromptProps) {
  const [answerVisible, setAnswerVisible] = useState(false);
  const [pendingResult, setPendingResult] = useState<Exclude<
    ScheduledReviewAnswerResult,
    "KNOWN"
  > | null>(null);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.prompt,
          pressed ? styles.pressed : null,
        ]}
        onPress={onOpenWord}
      >
        <View style={styles.column}>
          <Text style={styles.label}>Question</Text>
          <Text numberOfLines={2} style={styles.sourceText}>
            {item.sourceText}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.column}>
          <Text style={styles.label}>Answer</Text>
          {answerVisible ? (
            <Text numberOfLines={2} style={styles.targetText}>
              {item.targetText}
            </Text>
          ) : (
            <View style={styles.hiddenAnswer}>
              <Ionicons
                name="eye-off-outline"
                size={16}
                color={colors.textMuted}
              />
              <Text style={styles.hiddenAnswerText}>Hidden</Text>
            </View>
          )}
        </View>
      </Pressable>

      {!answerVisible ? (
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.pressed : null,
            ]}
            onPress={() => setAnswerVisible(true)}
          >
            <Text style={styles.primaryButtonText}>Show answer</Text>
          </Pressable>
        </View>
      ) : pendingResult ? (
        <View style={styles.destinationPanel}>
          <View style={styles.destinationHeader}>
            <View style={styles.destinationTitleBlock}>
              <Text style={styles.destinationTitle}>Choose the next box</Text>
              <Text style={styles.destinationSubtitle}>
                The timer will wait until you press Start.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Change answer result"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setPendingResult(null)}
            >
              <Ionicons name="arrow-back" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <ReviewDestinationPicker
            currentInterval={item.interval}
            disabled={disabled}
            onSelect={(nextInterval) =>
              onComplete({
                result: pendingResult,
                nextInterval,
              })
            }
          />
        </View>
      ) : (
        <View style={styles.resultPanel}>
          <Text style={styles.resultTitle}>How well did you know it?</Text>
          <View style={styles.resultActions}>
            <ResultButton
              disabled={disabled}
              icon="close-circle-outline"
              label="Didn't know"
              tone="danger"
              onPress={() => setPendingResult("INCORRECT")}
            />
            <ResultButton
              disabled={disabled}
              icon="checkmark-circle-outline"
              label="Knew it"
              tone="success"
              onPress={() => setPendingResult("CORRECT")}
            />
            <ResultButton
              disabled={disabled}
              icon="ribbon-outline"
              label="I know this"
              tone="navy"
              onPress={() => onComplete({ result: "KNOWN" })}
            />
          </View>
        </View>
      )}
    </View>
  );
}

type ResultButtonProps = {
  disabled: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone: "danger" | "navy" | "success";
};

function ResultButton({
  disabled,
  icon,
  label,
  onPress,
  tone,
}: ResultButtonProps) {
  const toneStyle =
    tone === "danger"
      ? styles.resultButtonDanger
      : tone === "success"
        ? styles.resultButtonSuccess
        : styles.resultButtonNavy;
  const color =
    tone === "danger"
      ? colors.error
      : tone === "success"
        ? colors.green
        : colors.navy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.resultButton,
        toneStyle,
        pressed ? styles.pressed : null,
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={17} color={color} />
      <Text style={[styles.resultButtonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
  },
  prompt: {
    minHeight: 96,
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  column: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: typography.weights.black,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  sourceText: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: typography.weights.semibold,
  },
  targetText: {
    color: colors.green,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: typography.weights.semibold,
  },
  divider: {
    width: 1,
    backgroundColor: "#F0E8DE",
  },
  hiddenAnswer: {
    minHeight: 38,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  hiddenAnswerText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: typography.weights.bold,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#F0E8DE",
    backgroundColor: colors.backgroundSoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryButton: {
    minHeight: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: typography.weights.black,
  },
  resultPanel: {
    borderTopWidth: 1,
    borderTopColor: "#F0E8DE",
    backgroundColor: colors.backgroundSoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  resultTitle: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  resultActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  resultButton: {
    minHeight: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  resultButtonDanger: {
    borderColor: "#F0B8B0",
    backgroundColor: "#FFF1F1",
  },
  resultButtonSuccess: {
    borderColor: "#DCECC3",
    backgroundColor: "#F4FAE9",
  },
  resultButtonNavy: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
  },
  resultButtonText: {
    fontSize: 12,
    fontWeight: typography.weights.black,
  },
  destinationPanel: {
    borderTopWidth: 1,
    borderTopColor: "#F0E8DE",
    backgroundColor: colors.backgroundSoft,
    padding: spacing.lg,
  },
  destinationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  destinationTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  destinationTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: typography.weights.black,
  },
  destinationSubtitle: {
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
