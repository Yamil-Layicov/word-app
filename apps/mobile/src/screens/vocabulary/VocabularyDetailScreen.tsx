import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  type VocabularyItem,
  useVocabularyItemQuery,
} from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import { useReplaceVocabularyItemContent } from "@/features/vocabulary";
import { isApiError } from "@/shared/api/http-error";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button, TextField } from "@/shared/ui";

const MAX_EXAMPLES = 20;

type ExampleDraft = {
  key: string;
  sourceSentence: string;
  targetSentence: string;
};

type ExampleFieldErrors = {
  sourceSentence?: string;
  targetSentence?: string;
};

type FieldErrors = {
  sourceText?: string;
  targetText?: string;
  examples: Record<string, ExampleFieldErrors>;
};

const EMPTY_ERRORS: FieldErrors = { examples: {} };

export function VocabularyDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const vocabularyItemId = typeof params.id === "string" ? params.id : "";
  const vocabularyItemQuery = useVocabularyItemQuery(vocabularyItemId);
  const replaceContentMutation = useReplaceVocabularyItemContent();
  const initializedItemId = useRef<string | null>(null);
  const nextExampleKey = useRef(0);
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [examples, setExamples] = useState<ExampleDraft[]>([]);
  const [errors, setErrors] = useState<FieldErrors>(EMPTY_ERRORS);
  const [notice, setNotice] = useState<string | null>(null);
  const hasUnauthorizedError = useAuthFailureRedirect(
    vocabularyItemQuery.error ?? replaceContentMutation.error,
  );

  useEffect(() => {
    const item = vocabularyItemQuery.data;

    if (!item || initializedItemId.current === item.id) {
      return;
    }

    initializedItemId.current = item.id;
    setFormFromItem(item, setSourceText, setTargetText, setExamples);
    setErrors(EMPTY_ERRORS);
    setNotice(null);
  }, [vocabularyItemQuery.data]);

  const addExample = () => {
    if (examples.length >= MAX_EXAMPLES) {
      return;
    }

    nextExampleKey.current += 1;
    setExamples((current) => [
      ...current,
      {
        key: `new-example-${nextExampleKey.current}`,
        sourceSentence: "",
        targetSentence: "",
      },
    ]);
  };

  const removeExample = (key: string) => {
    setExamples((current) => current.filter((example) => example.key !== key));
    setErrors((current) => {
      const nextExampleErrors = { ...current.examples };
      delete nextExampleErrors[key];

      return { ...current, examples: nextExampleErrors };
    });
  };

  const updateExample = (
    key: string,
    field: "sourceSentence" | "targetSentence",
    value: string,
  ) => {
    setExamples((current) =>
      current.map((example) =>
        example.key === key ? { ...example, [field]: value } : example,
      ),
    );
    setErrors((current) => ({
      ...current,
      examples: {
        ...current.examples,
        [key]: {
          ...current.examples[key],
          [field]: undefined,
        },
      },
    }));
  };

  const handleSave = async () => {
    const nextSourceText = sourceText.trim();
    const nextTargetText = targetText.trim();
    const nextErrors: FieldErrors = { examples: {} };
    const normalizedExamples = examples
      .map((example) => ({
        key: example.key,
        sourceSentence: example.sourceSentence.trim(),
        targetSentence: example.targetSentence.trim(),
      }))
      .filter(
        (example) => example.sourceSentence || example.targetSentence,
      );

    if (!nextSourceText) {
      nextErrors.sourceText = "Source word is required.";
    }

    if (!nextTargetText) {
      nextErrors.targetText = "Translation is required.";
    }

    normalizedExamples.forEach((example) => {
      const exampleErrors: ExampleFieldErrors = {};

      if (!example.sourceSentence) {
        exampleErrors.sourceSentence = "Source sentence is required.";
      }

      if (!example.targetSentence) {
        exampleErrors.targetSentence = "Translation is required.";
      }

      if (Object.keys(exampleErrors).length > 0) {
        nextErrors.examples[example.key] = exampleErrors;
      }
    });

    setErrors(nextErrors);
    setNotice(null);

    if (
      nextErrors.sourceText ||
      nextErrors.targetText ||
      Object.keys(nextErrors.examples).length > 0
    ) {
      return;
    }

    try {
      const updatedItem = await replaceContentMutation.mutateAsync({
        id: vocabularyItemId,
        data: {
          sourceText: nextSourceText,
          targetText: nextTargetText,
          examples: normalizedExamples.map(
            ({ sourceSentence, targetSentence }) => ({
              sourceSentence,
              targetSentence,
            }),
          ),
        },
      });

      setFormFromItem(
        updatedItem,
        setSourceText,
        setTargetText,
        setExamples,
      );
      setNotice("Changes saved.");
    } catch (error) {
      if (!isApiError(error) || error.status !== 401) {
        setNotice(
          isApiError(error) ? error.message : "Could not save changes.",
        );
      }
    }
  };

  return (
    <ScreenContainer
      backgroundColor={colors.backgroundWarm}
      contentStyle={styles.content}
    >
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={colors.navy} />
        </Pressable>
        <Text style={styles.title}>Edit word</Text>
        <View style={styles.topBarSpacer} />
      </View>

      {vocabularyItemQuery.isLoading ? <StateBox title="Loading word..." /> : null}

      {vocabularyItemQuery.isError && !hasUnauthorizedError ? (
        <StateBox
          actionTitle="Try again"
          title="Could not load this word."
          onAction={() => void vocabularyItemQuery.refetch()}
        />
      ) : null}

      {vocabularyItemQuery.data ? (
        <>
          <View style={styles.wordFields}>
            <TextField
              autoCapitalize="none"
              error={errors.sourceText}
              label="Word"
              maxLength={200}
              placeholder="book"
              value={sourceText}
              onChangeText={(value) => {
                setSourceText(value);
                setErrors((current) => ({
                  ...current,
                  sourceText: undefined,
                }));
              }}
            />
            <TextField
              autoCapitalize="none"
              error={errors.targetText}
              label="Translation"
              maxLength={200}
              placeholder="kitab"
              value={targetText}
              onChangeText={(value) => {
                setTargetText(value);
                setErrors((current) => ({
                  ...current,
                  targetText: undefined,
                }));
              }}
            />
          </View>

          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Examples</Text>
              <Text style={styles.sectionCount}>
                {examples.length}/{MAX_EXAMPLES}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Add example"
              accessibilityRole="button"
              accessibilityState={{
                disabled: examples.length >= MAX_EXAMPLES,
              }}
              disabled={examples.length >= MAX_EXAMPLES}
              style={({ pressed }) => [
                styles.addExampleButton,
                examples.length >= MAX_EXAMPLES
                  ? styles.buttonDisabled
                  : null,
                pressed ? styles.pressed : null,
              ]}
              onPress={addExample}
            >
              <Ionicons name="add" size={18} color={colors.orange} />
              <Text style={styles.addExampleText}>Add</Text>
            </Pressable>
          </View>

          {examples.length === 0 ? (
            <View style={styles.emptyExamples}>
              <Ionicons
                name="chatbox-ellipses-outline"
                size={24}
                color={colors.textMuted}
              />
              <Text style={styles.emptyExamplesText}>No examples yet.</Text>
            </View>
          ) : null}

          <View style={styles.exampleList}>
            {examples.map((example, index) => (
              <View key={example.key} style={styles.exampleCard}>
                <View style={styles.exampleHeader}>
                  <Text style={styles.exampleTitle}>Example {index + 1}</Text>
                  <Pressable
                    accessibilityLabel={`Remove example ${index + 1}`}
                    accessibilityRole="button"
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.removeExampleButton,
                      pressed ? styles.pressed : null,
                    ]}
                    onPress={() => removeExample(example.key)}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={colors.error}
                    />
                  </Pressable>
                </View>
                <TextField
                  error={errors.examples[example.key]?.sourceSentence}
                  label="Sentence"
                  maxLength={500}
                  multiline
                  placeholder="I read a book every evening."
                  style={styles.multilineInput}
                  textAlignVertical="top"
                  value={example.sourceSentence}
                  onChangeText={(value) =>
                    updateExample(example.key, "sourceSentence", value)
                  }
                />
                <TextField
                  error={errors.examples[example.key]?.targetSentence}
                  label="Translation"
                  maxLength={500}
                  multiline
                  placeholder="Mən hər axşam kitab oxuyuram."
                  style={styles.multilineInput}
                  textAlignVertical="top"
                  value={example.targetSentence}
                  onChangeText={(value) =>
                    updateExample(example.key, "targetSentence", value)
                  }
                />
              </View>
            ))}
          </View>

          {notice ? (
            <Text
              accessibilityRole="alert"
              style={[
                styles.notice,
                replaceContentMutation.isError ? styles.noticeError : null,
              ]}
            >
              {notice}
            </Text>
          ) : null}

          <Button
            disabled={replaceContentMutation.isPending}
            loading={replaceContentMutation.isPending}
            title="Save changes"
            style={styles.saveButton}
            onPress={() => void handleSave()}
          />
        </>
      ) : null}
    </ScreenContainer>
  );
}

function setFormFromItem(
  item: VocabularyItem,
  setSourceText: (value: string) => void,
  setTargetText: (value: string) => void,
  setExamples: (value: ExampleDraft[]) => void,
) {
  setSourceText(item.sourceText);
  setTargetText(item.targetText);
  setExamples(
    item.examples.map((example) => ({
      key: example.id,
      sourceSentence: example.sourceSentence,
      targetSentence: example.targetSentence,
    })),
  );
}

type StateBoxProps = {
  title: string;
  actionTitle?: string;
  onAction?: () => void;
};

function StateBox({ title, actionTitle, onAction }: StateBoxProps) {
  return (
    <View style={styles.stateBox}>
      <Text style={styles.stateTitle}>{title}</Text>
      {actionTitle && onAction ? (
        <Button title={actionTitle} variant="secondary" onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: colors.navy,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: typography.weights.bold,
  },
  topBarSpacer: {
    width: 42,
    height: 42,
  },
  wordFields: {
    gap: spacing.lg,
  },
  sectionHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: typography.weights.bold,
  },
  sectionCount: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: typography.weights.semibold,
  },
  addExampleButton: {
    minWidth: 76,
    minHeight: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.orange,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  addExampleText: {
    color: colors.orange,
    fontSize: 14,
    fontWeight: typography.weights.bold,
  },
  emptyExamples: {
    minHeight: 104,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  emptyExamplesText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: typography.weights.medium,
  },
  exampleList: {
    gap: spacing.md,
  },
  exampleCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  exampleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  exampleTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: typography.weights.bold,
  },
  removeExampleButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1ED",
  },
  multilineInput: {
    minHeight: 72,
  },
  notice: {
    color: colors.green,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: typography.weights.semibold,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  noticeError: {
    color: colors.error,
  },
  saveButton: {
    marginTop: spacing.lg,
  },
  stateBox: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.lg,
    gap: spacing.md,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: typography.weights.bold,
    textAlign: "center",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.72,
  },
});
