import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { LanguagePair } from "@/entities/lookups";
import { useLanguagePairsQuery } from "@/entities/lookups";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

export function LanguagePairSelectionScreen() {
  const [selectedLanguagePairId, setSelectedLanguagePairId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { data: languagePairs, isError, isLoading, refetch } = useLanguagePairsQuery();

  const selectedLanguagePair = languagePairs?.find(
    (languagePair) => languagePair.id === selectedLanguagePairId,
  );

  const handleContinue = () => {
    if (!selectedLanguagePair) {
      setNotice("Choose a language pair to continue.");
      return;
    }

    setNotice("Register integration will use this language pair next.");
  };

  return (
    <ScreenContainer backgroundColor={colors.backgroundWarm} contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Link href="/register" style={styles.backLink}>
          Back
        </Link>
      </View>

      <View style={styles.header}>
        <View style={styles.iconShell}>
          <Ionicons name="language-outline" size={32} color={colors.white} />
        </View>
        <Text style={styles.title}>Choose your languages</Text>
        <Text style={styles.subtitle}>
          Pick the first language pair you want to learn with Word App.
        </Text>
      </View>

      {isLoading ? <StateMessage title="Loading languages..." /> : null}

      {isError ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>Could not load language pairs.</Text>
          <Text style={styles.stateText}>Check the API connection and try again.</Text>
          <Button title="Try again" variant="secondary" onPress={() => void refetch()} />
        </View>
      ) : null}

      {!isLoading && !isError && languagePairs?.length === 0 ? (
        <StateMessage title="No language pairs available yet." />
      ) : null}

      {!isLoading && !isError && languagePairs?.length ? (
        <View style={styles.list}>
          {languagePairs.map((languagePair) => (
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
        </View>
      ) : null}

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <Button
        disabled={!selectedLanguagePair}
        title="Continue"
        onPress={handleContinue}
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
        <Ionicons name="book-outline" size={22} color={selected ? colors.white : colors.navy} />
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

function StateMessage({ title }: { title: string }) {
  return (
    <View style={styles.stateBox}>
      <Text style={styles.stateTitle}>{title}</Text>
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
  backLink: {
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
    fontSize: 33,
    lineHeight: 39,
    fontWeight: typography.weights.black,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: typography.weights.medium,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  list: {
    gap: spacing.md,
    marginBottom: spacing.lg,
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
    fontSize: 16,
    fontWeight: typography.weights.bold,
  },
  optionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
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
    marginBottom: spacing.lg,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: typography.weights.bold,
    textAlign: "center",
  },
  stateText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: typography.weights.medium,
    textAlign: "center",
  },
  notice: {
    color: colors.green,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: typography.weights.medium,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
});
