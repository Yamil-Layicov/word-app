import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { LanguagePair } from "@/entities/lookups";
import { useLanguagePairsQuery } from "@/entities/lookups";
import { type CefrLevel, useMeLanguagePairsQuery } from "@/entities/user-language-pair";
import { useAuthFailureRedirect } from "@/features/auth";
import { useAddLanguagePair } from "@/features/me";
import { isApiError } from "@/shared/api/http-error";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function AddLanguagePairScreen() {
  const router = useRouter();
  const languagePairsQuery = useLanguagePairsQuery();
  const meLanguagePairsQuery = useMeLanguagePairsQuery();
  const addLanguagePairMutation = useAddLanguagePair();
  const [selectedLanguagePairId, setSelectedLanguagePairId] = useState<string | null>(null);
  const [selectedCefrLevel, setSelectedCefrLevel] = useState<CefrLevel>("B1");
  const [notice, setNotice] = useState<string | null>(null);
  const hasUnauthorizedError = useAuthFailureRedirect(
    meLanguagePairsQuery.error ?? addLanguagePairMutation.error,
  );

  const existingLanguagePairIds = useMemo(
    () =>
      new Set(
        meLanguagePairsQuery.data?.map((languagePair) => languagePair.languagePairId) ?? [],
      ),
    [meLanguagePairsQuery.data],
  );

  const availableLanguagePairs = useMemo(
    () =>
      languagePairsQuery.data?.filter(
        (languagePair) => !existingLanguagePairIds.has(languagePair.id),
      ) ?? [],
    [existingLanguagePairIds, languagePairsQuery.data],
  );

  const selectedLanguagePair = availableLanguagePairs.find(
    (languagePair) => languagePair.id === selectedLanguagePairId,
  );

  const handleAddLanguagePair = async () => {
    if (!selectedLanguagePair) {
      setNotice("Choose a language pair to continue.");
      return;
    }

    setNotice(null);

    try {
      await addLanguagePairMutation.mutateAsync({
        languagePairId: selectedLanguagePair.id,
        targetCefrLevel: selectedCefrLevel,
      });
      router.back();
    } catch (error) {
      setNotice(isApiError(error) ? error.message : "Could not add language pair.");
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
          <Ionicons name="language-outline" size={30} color={colors.white} />
        </View>
        <Text style={styles.title}>Add language pair</Text>
        <Text style={styles.subtitle}>Choose another pair you want to learn.</Text>
      </View>

      {languagePairsQuery.isLoading || meLanguagePairsQuery.isLoading ? (
        <StateBox title="Loading language pairs..." />
      ) : null}

      {languagePairsQuery.isError ? (
        <StateBox
          title="Could not load available language pairs."
          actionTitle="Try again"
          onAction={() => void languagePairsQuery.refetch()}
        />
      ) : null}

      {meLanguagePairsQuery.isError && !hasUnauthorizedError ? (
        <StateBox
          title="Could not load your language pairs."
          actionTitle="Try again"
          onAction={() => void meLanguagePairsQuery.refetch()}
        />
      ) : null}

      {!languagePairsQuery.isLoading &&
      !meLanguagePairsQuery.isLoading &&
      !languagePairsQuery.isError &&
      !meLanguagePairsQuery.isError &&
      availableLanguagePairs.length === 0 ? (
        <StateBox title="No new language pairs available." />
      ) : null}

      {availableLanguagePairs.map((languagePair) => (
        <LanguagePairOption
          key={languagePair.id}
          languagePair={languagePair}
          selected={languagePair.id === selectedLanguagePairId}
          onPress={() => {
            setSelectedLanguagePairId(languagePair.id);
            setNotice(null);
          }}
        />
      ))}

      {availableLanguagePairs.length > 0 ? (
        <View style={styles.levelSection}>
          <Text style={styles.levelTitle}>Target level</Text>
          <View style={styles.levelGrid}>
            {CEFR_LEVELS.map((level) => (
              <Pressable
                key={level}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedCefrLevel === level }}
                style={[
                  styles.levelButton,
                  selectedCefrLevel === level ? styles.levelButtonSelected : null,
                ]}
                onPress={() => setSelectedCefrLevel(level)}
              >
                <Text
                  style={[
                    styles.levelButtonText,
                    selectedCefrLevel === level ? styles.levelButtonTextSelected : null,
                  ]}
                >
                  {level}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {notice ? (
        <Text style={[styles.notice, addLanguagePairMutation.isError ? styles.noticeError : null]}>
          {notice}
        </Text>
      ) : null}

      <Button
        disabled={!selectedLanguagePair || addLanguagePairMutation.isPending}
        loading={addLanguagePairMutation.isPending}
        title="Add language pair"
        style={styles.addButton}
        onPress={handleAddLanguagePair}
      />
    </ScreenContainer>
  );
}

type LanguagePairOptionProps = {
  languagePair: LanguagePair;
  selected: boolean;
  onPress: () => void;
};

function LanguagePairOption({ languagePair, selected, onPress }: LanguagePairOptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.option, selected ? styles.optionSelected : null]}
      onPress={onPress}
    >
      <View style={styles.optionIcon}>
        <Ionicons name="book-outline" size={21} color={selected ? colors.white : colors.navy} />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>
          {languagePair.sourceLanguage.name} to {languagePair.targetLanguage.name}
        </Text>
        <Text style={styles.optionSubtitle}>
          {languagePair.sourceLanguage.nativeName} {"->"} {languagePair.targetLanguage.nativeName}
        </Text>
      </View>
      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={24}
        color={selected ? colors.green : colors.borderStrong}
      />
    </Pressable>
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
    fontSize: 32,
    lineHeight: 38,
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
  option: {
    minHeight: 82,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  optionSelected: {
    borderColor: colors.green,
    backgroundColor: colors.white,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.orange,
  },
  optionText: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: typography.weights.bold,
  },
  optionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typography.weights.medium,
    marginTop: spacing.xs,
  },
  stateBox: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: typography.weights.bold,
    textAlign: "center",
  },
  levelSection: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    padding: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  levelTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  levelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  levelButton: {
    minWidth: 54,
    minHeight: 38,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  levelButtonSelected: {
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
  levelButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: typography.weights.bold,
  },
  levelButtonTextSelected: {
    color: colors.white,
  },
  notice: {
    color: colors.green,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: typography.weights.medium,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  noticeError: {
    color: colors.error,
  },
  addButton: {
    marginTop: spacing.md,
  },
});
