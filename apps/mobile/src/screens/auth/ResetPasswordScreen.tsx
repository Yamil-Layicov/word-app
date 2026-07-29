import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  AUTH_ROUTE_NOTICE,
  isValidPasswordResetToken,
  useAuthSession,
  useResetPassword,
  validateResetPasswordForm,
  type ResetPasswordFormErrors,
} from "@/features/auth";
import { isApiError } from "@/shared/api/http-error";
import { AuthScreenScaffold } from "@/shared/layout/AuthScreenScaffold";
import { colors, spacing, typography } from "@/shared/theme";
import { Button, PasswordField } from "@/shared/ui";

const INVALID_LINK_MESSAGE =
  "This password reset link is invalid or incomplete.";

export function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    token?: string | string[];
  }>();
  const { endSession } = useAuthSession();
  const resetPasswordMutation = useResetPassword();
  const token = getFirstParam(params.token);
  const hasValidToken = isValidPasswordResetToken(token);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<ResetPasswordFormErrors>({});
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async () => {
    const validation = validateResetPasswordForm({
      token,
      password,
      confirmPassword,
    });
    setNotice(null);

    if (!validation.success) {
      setErrors(validation.errors);
      setNotice(validation.errors.token ?? null);
      return;
    }

    setErrors({});

    try {
      await resetPasswordMutation.mutateAsync(validation.data);
      await endSession({ revokeServerSession: false });
      router.replace({
        pathname: "/login",
        params: {
          notice: AUTH_ROUTE_NOTICE.passwordReset,
        },
      });
    } catch (error) {
      setNotice(
        isApiError(error) ? error.message : "Could not reset your password.",
      );
    }
  };

  const visibleNotice =
    notice ?? (!hasValidToken ? INVALID_LINK_MESSAGE : null);

  return (
    <AuthScreenScaffold
      title="Create new password"
      subtitle="Choose a new password for your account."
      variant="recovery"
    >
      <View style={styles.fields}>
        <PasswordField
          autoComplete="new-password"
          error={errors.password}
          placeholder="New password"
          returnKeyType="next"
          textContentType="newPassword"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setErrors((current) => ({
              ...current,
              password: undefined,
              confirmPassword: undefined,
            }));
            setNotice(null);
          }}
        />

        <PasswordField
          autoComplete="new-password"
          error={errors.confirmPassword}
          placeholder="Confirm new password"
          returnKeyType="done"
          textContentType="newPassword"
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            setErrors((current) => ({
              ...current,
              confirmPassword: undefined,
            }));
            setNotice(null);
          }}
          onSubmitEditing={() => {
            void handleSubmit();
          }}
        />
      </View>

      {visibleNotice ? (
        <Text accessibilityLiveRegion="polite" style={styles.notice}>
          {visibleNotice}
        </Text>
      ) : null}

      <Button
        disabled={!hasValidToken || resetPasswordMutation.isPending}
        loading={resetPasswordMutation.isPending}
        title="Reset password"
        onPress={handleSubmit}
      />

      <Text style={styles.footerText}>
        Back to{" "}
        <Link href="/login" style={styles.footerLink}>
          Log in
        </Link>
      </Text>
    </AuthScreenScaffold>
  );
}

function getFirstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const styles = StyleSheet.create({
  fields: {
    gap: spacing.md,
  },
  notice: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: typography.weights.medium,
    textAlign: "center",
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    fontWeight: typography.weights.medium,
  },
  footerLink: {
    color: colors.orange,
    fontWeight: typography.weights.bold,
  },
});
