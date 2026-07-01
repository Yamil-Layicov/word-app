import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { type ReactNode, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { CefrLevel, WordType } from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import { useCreateVocabularyItem } from "@/features/vocabulary";
import { isApiError } from "@/shared/api/http-error";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button, TextField } from "@/shared/ui";

const WORD_TYPES: WordType[] = ["NOUN", "VERB", "ADJECTIVE", "ADVERB", "PHRASE", "OTHER"];
const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

type FieldErrors = {
  sourceText?: string;
  targetText?: string;
};

export function VocabularyCreateScreen() {
  const router = useRouter();
  const createVocabularyItemMutation = useCreateVocabularyItem();
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [definition, setDefinition] = useState("");
  const [note, setNote] = useState("");
  const [wordType, setWordType] = useState<WordType>("NOUN");
  const [cefrLevel, setCefrLevel] = useState<CefrLevel>("A1");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const hasUnauthorizedError = useAuthFailureRedirect(createVocabularyItemMutation.error);

  const handleCreate = async () => {
    const nextErrors: FieldErrors = {};
    const nextSourceText = sourceText.trim();
    const nextTargetText = targetText.trim();
    const nextDefinition = definition.trim();
    const nextNote = note.trim();

    if (!nextSourceText) {
      nextErrors.sourceText = "Source text is required.";
    } else if (nextSourceText.length > 200) {
      nextErrors.sourceText = "Source text must be 200 characters or fewer.";
    }

    if (!nextTargetText) {
      nextErrors.targetText = "Target text is required.";
    } else if (nextTargetText.length > 200) {
      nextErrors.targetText = "Target text must be 200 characters or fewer.";
    }

    setErrors(nextErrors);
    setNotice(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      const item = await createVocabularyItemMutation.mutateAsync({
        sourceText: nextSourceText,
        targetText: nextTargetText,
        wordType,
        cefrLevel,
        ...(nextDefinition ? { definition: nextDefinition } : {}),
        ...(nextNote ? { note: nextNote } : {}),
      });

      router.replace({
        pathname: "/vocabulary/[id]",
        params: { id: item.id },
      });
    } catch (error) {
      if (!hasUnauthorizedError) {
        setNotice(isApiError(error) ? error.message : "Could not create word.");
      }
    }
  };

  return (
    <ScreenContainer backgroundColor={colors.backgroundWarm} contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.orange} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>

      <View style={styles.header}>
        <View style={styles.iconShell}>
          <Ionicons name="add-circle-outline" size={30} color={colors.white} />
        </View>
        <Text style={styles.title}>Add word</Text>
        <Text style={styles.subtitle}>Save a new word to your active language pair.</Text>
      </View>

      <View style={styles.formCard}>
        <TextField
          autoCapitalize="none"
          error={errors.sourceText}
          label="Source text"
          maxLength={200}
          placeholder="book"
          value={sourceText}
          onChangeText={(value) => {
            setSourceText(value);
            setErrors((current) => ({ ...current, sourceText: undefined }));
          }}
        />
        <TextField
          autoCapitalize="none"
          error={errors.targetText}
          label="Target text"
          maxLength={200}
          placeholder="kitab"
          value={targetText}
          onChangeText={(value) => {
            setTargetText(value);
            setErrors((current) => ({ ...current, targetText: undefined }));
          }}
        />

        <OptionSection title="Word type">
          {WORD_TYPES.map((type) => (
            <OptionButton
              key={type}
              label={formatOptionLabel(type)}
              selected={wordType === type}
              onPress={() => setWordType(type)}
            />
          ))}
        </OptionSection>

        <OptionSection title="CEFR level">
          {CEFR_LEVELS.map((level) => (
            <OptionButton
              key={level}
              label={level}
              selected={cefrLevel === level}
              onPress={() => setCefrLevel(level)}
            />
          ))}
        </OptionSection>

        <TextField
          label="Definition"
          maxLength={1000}
          multiline
          placeholder="A written or printed work"
          style={styles.multilineInput}
          value={definition}
          onChangeText={setDefinition}
        />
        <TextField
          label="Note"
          maxLength={1000}
          multiline
          placeholder="Common daily word"
          style={styles.multilineInput}
          value={note}
          onChangeText={setNote}
        />
      </View>

      {notice ? (
        <Text style={[styles.notice, createVocabularyItemMutation.isError ? styles.noticeError : null]}>
          {notice}
        </Text>
      ) : null}

      <Button
        disabled={createVocabularyItemMutation.isPending}
        loading={createVocabularyItemMutation.isPending}
        title="Create word"
        style={styles.createButton}
        onPress={handleCreate}
      />
    </ScreenContainer>
  );
}

type OptionSectionProps = {
  children: ReactNode;
  title: string;
};

function OptionSection({ children, title }: OptionSectionProps) {
  return (
    <View style={styles.optionSection}>
      <Text style={styles.optionSectionTitle}>{title}</Text>
      <View style={styles.optionGrid}>{children}</View>
    </View>
  );
}

type OptionButtonProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function OptionButton({ label, selected, onPress }: OptionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.optionButton, selected ? styles.optionButtonSelected : null]}
      onPress={onPress}
    >
      <Text style={[styles.optionButtonText, selected ? styles.optionButtonTextSelected : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function formatOptionLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.slice(0, 1) + part.slice(1).toLowerCase())
    .join(" ");
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    minHeight: 40,
    justifyContent: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    minHeight: 36,
  },
  backText: {
    color: colors.orange,
    fontSize: 15,
    fontWeight: typography.weights.bold,
  },
  header: {
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  iconShell: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.navy,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: typography.weights.black,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: typography.weights.medium,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  formCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  optionSection: {
    gap: spacing.md,
  },
  optionSectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: typography.weights.semibold,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  optionButton: {
    minHeight: 38,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  optionButtonSelected: {
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
  optionButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: typography.weights.bold,
  },
  optionButtonTextSelected: {
    color: colors.white,
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  notice: {
    color: colors.green,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: typography.weights.medium,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  noticeError: {
    color: colors.error,
  },
  createButton: {
    marginTop: spacing.lg,
  },
});
