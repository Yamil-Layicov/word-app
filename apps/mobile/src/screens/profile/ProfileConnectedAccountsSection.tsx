import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getGoogleSignInErrorMessage,
  isGoogleSignInSupported,
  requestGoogleIdToken,
  useAuthFailureRedirect,
  useAuthIdentitiesQuery,
  useLinkGoogleAccount,
} from "@/features/auth";
import { isApiError } from "@/shared/api/http-error";
import { colors, radii, spacing, typography } from "@/shared/theme";

export function ProfileConnectedAccountsSection() {
  const identitiesQuery = useAuthIdentitiesQuery();
  const linkGoogleAccountMutation = useLinkGoogleAccount();
  const [isRequestingGoogleCredential, setIsRequestingGoogleCredential] =
    useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isNoticeError, setIsNoticeError] = useState(false);
  const authError = identitiesQuery.error ?? linkGoogleAccountMutation.error;
  const hasUnauthorizedError = useAuthFailureRedirect(authError);
  const googleIdentity = identitiesQuery.data?.find(
    (identity) => identity.provider === "GOOGLE",
  );
  const googleSignInSupported = isGoogleSignInSupported();
  const isConnecting =
    isRequestingGoogleCredential || linkGoogleAccountMutation.isPending;

  const handleConnectGoogle = async () => {
    if (!googleSignInSupported || isConnecting || googleIdentity) {
      return;
    }

    setNotice(null);
    setIsNoticeError(false);
    setIsRequestingGoogleCredential(true);

    try {
      const credential = await requestGoogleIdToken();

      if (credential.status === "CANCELLED") {
        return;
      }

      await linkGoogleAccountMutation.mutateAsync({
        idToken: credential.idToken,
      });
      setNotice("Google account connected.");
      setIsNoticeError(false);
    } catch (error) {
      setNotice(
        isApiError(error)
          ? error.message
          : getGoogleSignInErrorMessage(error),
      );
      setIsNoticeError(true);
    } finally {
      setIsRequestingGoogleCredential(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Sign-in methods</Text>

      <View style={styles.accountRow}>
        <View style={styles.iconShell}>
          <Ionicons name="logo-google" size={21} color={colors.navy} />
        </View>

        <View style={styles.accountText}>
          <Text style={styles.accountTitle}>Google</Text>
          <Text numberOfLines={1} style={styles.accountMeta}>
            {identitiesQuery.isLoading
              ? "Checking connection..."
              : googleIdentity?.email || "Not connected"}
          </Text>
        </View>

        {identitiesQuery.isLoading ? (
          <ActivityIndicator color={colors.orange} size="small" />
        ) : googleIdentity ? (
          <View style={styles.connectedBadge}>
            <Ionicons name="checkmark" size={14} color={colors.white} />
            <Text style={styles.connectedText}>Connected</Text>
          </View>
        ) : identitiesQuery.isError && !hasUnauthorizedError ? (
          <Pressable
            accessibilityLabel="Retry sign-in methods"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.outlineButton,
              pressed ? styles.pressed : null,
            ]}
            onPress={() => void identitiesQuery.refetch()}
          >
            <Text style={styles.outlineButtonText}>Retry</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityLabel="Connect Google account"
            accessibilityRole="button"
            accessibilityState={{
              disabled: !googleSignInSupported || isConnecting,
            }}
            disabled={!googleSignInSupported || isConnecting}
            style={({ pressed }) => [
              styles.connectButton,
              !googleSignInSupported || isConnecting
                ? styles.disabled
                : null,
              pressed ? styles.pressed : null,
            ]}
            onPress={() => {
              void handleConnectGoogle();
            }}
          >
            {isConnecting ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.connectButtonText}>
                {googleSignInSupported ? "Connect" : "Mobile only"}
              </Text>
            )}
          </Pressable>
        )}
      </View>

      {notice ? (
        <Text
          style={[
            styles.notice,
            isNoticeError ? styles.noticeError : null,
          ]}
        >
          {notice}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: typography.weights.black,
    marginBottom: spacing.md,
  },
  accountRow: {
    minHeight: 72,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  iconShell: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  accountText: {
    flex: 1,
    minWidth: 0,
  },
  accountTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: typography.weights.bold,
  },
  accountMeta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
  connectedBadge: {
    borderRadius: radii.pill,
    backgroundColor: colors.green,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  connectedText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
  connectButton: {
    minWidth: 82,
    minHeight: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  connectButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
  outlineButton: {
    minWidth: 72,
    minHeight: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  outlineButtonText: {
    color: colors.orange,
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
  notice: {
    color: colors.green,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typography.weights.medium,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  noticeError: {
    color: colors.error,
  },
  disabled: {
    opacity: 0.54,
  },
  pressed: {
    opacity: 0.72,
  },
});
