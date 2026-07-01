import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useMeProfileQuery } from "@/entities/user";
import { type UserLanguagePair, useMeLanguagePairsQuery } from "@/entities/user-language-pair";
import { useAuthFailureRedirect } from "@/features/auth";
import { useUpdateProfile } from "@/features/me";
import { isApiError } from "@/shared/api/http-error";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";
import { Button, TextField } from "@/shared/ui";

export function ProfileScreen() {
  const router = useRouter();
  const profileQuery = useMeProfileQuery();
  const languagePairsQuery = useMeLanguagePairsQuery();
  const updateProfileMutation = useUpdateProfile();
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [displayNameError, setDisplayNameError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const authError = profileQuery.error ?? languagePairsQuery.error ?? updateProfileMutation.error;
  const hasUnauthorizedError = useAuthFailureRedirect(authError);

  const profile = profileQuery.data;
  const savedDisplayName = profile?.profile?.displayName ?? "";
  const displayName = profile?.profile?.displayName || "Your profile";
  const activeLanguagePair = profile?.activeLanguagePair;
  const activePairLabel = activeLanguagePair
    ? `${activeLanguagePair.sourceLanguage.name} -> ${activeLanguagePair.targetLanguage.name}`
    : "Not selected";

  useEffect(() => {
    if (!isEditingDisplayName) {
      setDisplayNameInput(savedDisplayName);
    }
  }, [isEditingDisplayName, savedDisplayName]);

  const handleStartEditDisplayName = () => {
    setDisplayNameInput(savedDisplayName);
    setDisplayNameError(undefined);
    setNotice(null);
    setIsEditingDisplayName(true);
  };

  const handleCancelEditDisplayName = () => {
    setDisplayNameInput(savedDisplayName);
    setDisplayNameError(undefined);
    setIsEditingDisplayName(false);
  };

  const handleSaveDisplayName = async () => {
    const nextDisplayName = displayNameInput.trim();

    if (nextDisplayName.length < 2) {
      setDisplayNameError("Display name must be at least 2 characters.");
      return;
    }

    if (nextDisplayName.length > 50) {
      setDisplayNameError("Display name must be 50 characters or fewer.");
      return;
    }

    if (nextDisplayName === savedDisplayName) {
      setIsEditingDisplayName(false);
      return;
    }

    setDisplayNameError(undefined);
    setNotice(null);

    try {
      await updateProfileMutation.mutateAsync({ displayName: nextDisplayName });
      setIsEditingDisplayName(false);
      setNotice("Profile updated.");
    } catch (error) {
      setNotice(isApiError(error) ? error.message : "Could not update profile.");
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
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
        </View>
        <Text style={styles.title}>{displayName}</Text>
        <Text style={styles.subtitle}>
          {profileQuery.isLoading ? "Loading profile..." : profile?.email}
        </Text>
      </View>

      {profileQuery.isError && !hasUnauthorizedError ? (
        <StateBox
          title="Could not load your profile."
          actionTitle="Try again"
          onAction={() => void profileQuery.refetch()}
        />
      ) : null}

      {profile ? (
        <View style={styles.card}>
          <View style={styles.displayNameHeader}>
            <InfoRow label="Display name" value={profile.profile?.displayName || "Not set"} />
            {!isEditingDisplayName ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                style={styles.editButton}
                onPress={handleStartEditDisplayName}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
            ) : null}
          </View>

          {isEditingDisplayName ? (
            <View style={styles.editForm}>
              <TextField
                autoCapitalize="words"
                error={displayNameError}
                label="New display name"
                maxLength={50}
                placeholder="Your name"
                value={displayNameInput}
                onChangeText={(value) => {
                  setDisplayNameInput(value);
                  setDisplayNameError(undefined);
                }}
              />
              <View style={styles.editActions}>
                <Button
                  disabled={updateProfileMutation.isPending}
                  title="Cancel"
                  variant="secondary"
                  style={styles.editAction}
                  onPress={handleCancelEditDisplayName}
                />
                <Button
                  disabled={updateProfileMutation.isPending}
                  loading={updateProfileMutation.isPending}
                  title="Save"
                  style={styles.editAction}
                  onPress={handleSaveDisplayName}
                />
              </View>
            </View>
          ) : null}

          {notice ? (
            <Text style={[styles.notice, updateProfileMutation.isError ? styles.noticeError : null]}>
              {notice}
            </Text>
          ) : null}

          <InfoRow label="Email" value={profile.email} />
          <InfoRow label="Country" value={profile.profile?.countryCode || "Not set"} />
          <InfoRow label="Interface language" value={profile.profile?.interfaceLanguage || "Not set"} />
          <InfoRow label="Active pair" value={activePairLabel} />
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Language pairs</Text>
      </View>

      {languagePairsQuery.isLoading ? <StateBox title="Loading language pairs..." /> : null}

      {languagePairsQuery.isError && !hasUnauthorizedError ? (
        <StateBox
          title="Could not load language pairs."
          actionTitle="Try again"
          onAction={() => void languagePairsQuery.refetch()}
        />
      ) : null}

      {languagePairsQuery.data?.length === 0 ? (
        <StateBox title="No language pairs added yet." />
      ) : null}

      {languagePairsQuery.data?.map((languagePair) => (
        <LanguagePairRow key={languagePair.id} languagePair={languagePair} />
      ))}
    </ScreenContainer>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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

function LanguagePairRow({ languagePair }: { languagePair: UserLanguagePair }) {
  const pairLabel = `${languagePair.languagePair.sourceLanguage.name} -> ${languagePair.languagePair.targetLanguage.name}`;

  return (
    <View style={styles.pairRow}>
      <View style={styles.pairIcon}>
        <Ionicons name="language-outline" size={20} color={colors.navy} />
      </View>
      <View style={styles.pairText}>
        <Text style={styles.pairTitle}>{pairLabel}</Text>
        <Text style={styles.pairMeta}>
          {languagePair.targetCefrLevel || "No level"} {languagePair.isLearning ? "learning" : "paused"}
        </Text>
      </View>
      {languagePair.isActive ? (
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Active</Text>
        </View>
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
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy,
    marginBottom: spacing.lg,
  },
  avatarText: {
    color: colors.white,
    fontSize: 30,
    fontWeight: typography.weights.black,
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
    fontSize: 15,
    lineHeight: 22,
    fontWeight: typography.weights.medium,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    padding: spacing.lg,
    gap: spacing.md,
  },
  displayNameHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  editButton: {
    minHeight: 32,
    justifyContent: "center",
  },
  editButtonText: {
    color: colors.orange,
    fontSize: 14,
    fontWeight: typography.weights.bold,
  },
  editForm: {
    gap: spacing.md,
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  editAction: {
    flex: 1,
    minHeight: 50,
  },
  notice: {
    color: colors.green,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: typography.weights.medium,
  },
  noticeError: {
    color: colors.error,
  },
  infoRow: {
    gap: spacing.xs,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: typography.weights.semibold,
  },
  infoValue: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: typography.weights.bold,
  },
  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: typography.weights.black,
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
  pairRow: {
    minHeight: 78,
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
  pairIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  pairText: {
    flex: 1,
    minWidth: 0,
  },
  pairTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: typography.weights.bold,
  },
  pairMeta: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typography.weights.medium,
    marginTop: spacing.xs,
  },
  activeBadge: {
    borderRadius: radii.pill,
    backgroundColor: colors.green,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  activeBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
});
