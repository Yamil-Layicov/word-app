import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { setAccessToken } from "@/auth";
import { useLogin } from "@/features/auth";
import { isApiError } from "@/shared/api/http-error";
import { AuthScreenScaffold } from "@/shared/layout/AuthScreenScaffold";
import { colors, spacing, typography } from "@/shared/theme";
import { Button, PasswordField, TextField } from "@/shared/ui";

type LoginErrors = {
  email?: string;
  password?: string;
};

function isEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

export function LoginScreen() {
  const router = useRouter();
  const loginMutation = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeType, setNoticeType] = useState<"info" | "error">("info");

  const handleSubmit = async () => {
    const nextErrors: LoginErrors = {};

    if (!email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!isEmail(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    setErrors(nextErrors);
    setNotice(null);

    if (Object.keys(nextErrors).length === 0) {
      try {
        const response = await loginMutation.mutateAsync({
          email: email.trim().toLowerCase(),
          password,
        });

        setAccessToken(response.accessToken);
        router.replace("/(app)");
      } catch (error) {
        setNoticeType("error");
        setNotice(isApiError(error) ? error.message : "Could not log in.");
      }
    }
  };

  const handleForgotPassword = () => {
    setNoticeType("info");
    setNotice("Password reset is not connected yet.");
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
        onPress={handleForgotPassword}
      >
        <Text style={styles.forgotText}>Forgot password?</Text>
      </Pressable>

      {notice ? (
        <Text style={[styles.notice, noticeType === "error" ? styles.noticeError : null]}>
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
