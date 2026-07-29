import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  useLogin,
  useStartSession,
  validateLoginForm,
  getAuthRouteNoticeMessage,
  type LoginFormErrors,
} from "@/features/auth";
import { consumePendingNotificationDestination } from "@/features/push-notifications";
import { isApiError } from "@/shared/api/http-error";
import { AuthScreenScaffold } from "@/shared/layout/AuthScreenScaffold";
import { colors, spacing, typography } from "@/shared/theme";
import { Button, PasswordField, TextField } from "@/shared/ui";

export function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    notice?: string | string[];
  }>();
  const loginMutation = useLogin();
  const startSession = useStartSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [notice, setNotice] = useState<string | null>(() =>
    getAuthRouteNoticeMessage(params.notice),
  );
  const [noticeType, setNoticeType] = useState<"info" | "error">("info");

  const handleSubmit = async () => {
    const validation = validateLoginForm({ email, password });
    setNotice(null);

    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});

    try {
      const response = await loginMutation.mutateAsync(validation.data);

      await startSession(response);
      router.replace(consumePendingNotificationDestination() ?? "/(app)");
    } catch (error) {
      setNoticeType("error");
      setNotice(isApiError(error) ? error.message : "Could not log in.");
    }
  };

  return (
    <AuthScreenScaffold
      title="Welcome back"
      subtitle="Log in to continue your language journey."
      variant="login"
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
          textContentType="emailAddress"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setErrors((current) => ({ ...current, email: undefined }));
          }}
        />

        <PasswordField
          error={errors.password}
          placeholder="Password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setErrors((current) => ({ ...current, password: undefined }));
          }}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        style={styles.forgotButton}
        onPress={() => router.push("./forgot-password")}
      >
        <Text style={styles.forgotText}>Forgot password?</Text>
      </Pressable>

      {notice ? (
        <Text
          style={[
            styles.notice,
            noticeType === "error" ? styles.noticeError : null,
          ]}
        >
          {notice}
        </Text>
      ) : null}

      <Button
        disabled={loginMutation.isPending}
        loading={loginMutation.isPending}
        title="Log in"
        onPress={handleSubmit}
      />

      <Text style={styles.footerText}>
        No account yet?{" "}
        <Link href="/register" style={styles.footerLink}>
          Sign up
        </Link>
      </Text>
    </AuthScreenScaffold>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: spacing.md,
  },
  forgotButton: {
    alignSelf: "flex-end",
  },
  forgotText: {
    color: colors.green,
    fontSize: 15,
    fontWeight: typography.weights.semibold,
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
