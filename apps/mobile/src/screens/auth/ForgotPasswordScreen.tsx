import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  useRequestPasswordReset,
  validateForgotPasswordForm,
  type ForgotPasswordFormErrors,
} from "@/features/auth";
import { isApiError } from "@/shared/api/http-error";
import { AuthScreenScaffold } from "@/shared/layout/AuthScreenScaffold";
import { colors, spacing, typography } from "@/shared/theme";
import { Button, TextField } from "@/shared/ui";

export function ForgotPasswordScreen() {
  const requestPasswordResetMutation = useRequestPasswordReset();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<ForgotPasswordFormErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");

  const handleSubmit = async () => {
    const validation = validateForgotPasswordForm({ email });
    setNotice(null);

    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});

    try {
      const response = await requestPasswordResetMutation.mutateAsync(
        validation.data,
      );

      setNoticeType("success");
      setNotice(response.message);
    } catch (error) {
      setNoticeType("error");
      setNotice(
        isApiError(error)
          ? error.message
          : "Could not request a password reset.",
      );
    }
  };

  return (
    <AuthScreenScaffold
      title="Reset password"
      subtitle="Enter your email and we will send you instructions."
      variant="recovery"
    >
      <View style={styles.fields}>
        <TextField
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          error={errors.email}
          icon="mail-outline"
          keyboardType="email-address"
          placeholder="Email address"
          returnKeyType="send"
          textContentType="emailAddress"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setErrors({});
            setNotice(null);
          }}
          onSubmitEditing={() => {
            void handleSubmit();
          }}
        />
      </View>

      {notice ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[
            styles.notice,
            noticeType === "error" ? styles.noticeError : null,
          ]}
        >
          {notice}
        </Text>
      ) : null}

      <Button
        disabled={requestPasswordResetMutation.isPending}
        loading={requestPasswordResetMutation.isPending}
        title="Send reset link"
        onPress={handleSubmit}
      />

      <Text style={styles.footerText}>
        Remember your password?{" "}
        <Link href="/login" style={styles.footerLink}>
          Log in
        </Link>
      </Text>
    </AuthScreenScaffold>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: spacing.md,
  },
  notice: {
    color: colors.green,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: typography.weights.medium,
    textAlign: "center",
  },
  noticeError: {
    color: colors.error,
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
