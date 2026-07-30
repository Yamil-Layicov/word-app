import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  AUTH_API_ERROR_CODE,
  clearGoogleAuthDraft,
  clearRegisterDraft,
  getGoogleSignInErrorMessage,
  isGoogleAuthAuthenticated,
  isGoogleSignInSupported,
  requestGoogleIdToken,
  saveGoogleAuthDraft,
  useGoogleAuth,
  useLogin,
  useStartSession,
  validateLoginForm,
  getAuthRouteNoticeMessage,
  type LoginFormErrors,
} from "@/features/auth";
import { consumePendingNotificationDestination } from "@/features/push-notifications";
import { getApiRetryAfterSeconds, isApiError } from "@/shared/api/http-error";
import {
  formatRetryAfterDuration,
  useRetryAfterCountdown,
} from "@/shared/hooks/useRetryAfterCountdown";
import { AuthScreenScaffold } from "@/shared/layout/AuthScreenScaffold";
import { colors, spacing, typography } from "@/shared/theme";
import { Button, PasswordField, TextField } from "@/shared/ui";

export function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    notice?: string | string[];
  }>();
  const loginMutation = useLogin();
  const googleAuthMutation = useGoogleAuth();
  const startSession = useStartSession();
  const retryAfterCountdown = useRetryAfterCountdown();
  const googleSignInSupported = isGoogleSignInSupported();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRequestingGoogleCredential, setIsRequestingGoogleCredential] =
    useState(false);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [notice, setNotice] = useState<string | null>(() =>
    getAuthRouteNoticeMessage(params.notice),
  );
  const [noticeType, setNoticeType] = useState<"info" | "error">("info");

  const handleSubmit = async () => {
    if (retryAfterCountdown.isActive) {
      return;
    }

    const validation = validateLoginForm({ email, password });
    setNotice(null);

    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});

    try {
      const response = await loginMutation.mutateAsync(validation.data);

      clearGoogleAuthDraft();
      clearRegisterDraft();
      await startSession(response);
      router.replace(consumePendingNotificationDestination() ?? "/(app)");
    } catch (error) {
      if (
        isApiError(error) &&
        error.response?.code === AUTH_API_ERROR_CODE.emailVerificationRequired
      ) {
        router.replace({
          pathname: "/verify-email",
          params: {
            email: validation.data.email,
          },
        });
        return;
      }

      const retryAfterSeconds = getApiRetryAfterSeconds(error);

      if (retryAfterSeconds !== null) {
        retryAfterCountdown.start(retryAfterSeconds);
      }

      setNoticeType("error");
      setNotice(isApiError(error) ? error.message : "Could not log in.");
    }
  };

  const handleGoogleSignIn = async () => {
    if (retryAfterCountdown.isActive || isRequestingGoogleCredential) {
      return;
    }

    setNotice(null);
    setIsRequestingGoogleCredential(true);

    try {
      const credential = await requestGoogleIdToken();

      if (credential.status === "CANCELLED") {
        return;
      }

      const response = await googleAuthMutation.mutateAsync({
        idToken: credential.idToken,
      });

      if (isGoogleAuthAuthenticated(response)) {
        clearGoogleAuthDraft();
        clearRegisterDraft();
        await startSession(response);
        router.replace(consumePendingNotificationDestination() ?? "/(app)");
        return;
      }

      clearRegisterDraft();
      saveGoogleAuthDraft({
        idToken: credential.idToken,
        profile: response.profile,
      });
      router.push("/language-pair");
    } catch (error) {
      const retryAfterSeconds = getApiRetryAfterSeconds(error);

      if (retryAfterSeconds !== null) {
        retryAfterCountdown.start(retryAfterSeconds);
      }

      setNoticeType("error");
      setNotice(
        isApiError(error)
          ? error.message
          : getGoogleSignInErrorMessage(error),
      );
    } finally {
      setIsRequestingGoogleCredential(false);
    }
  };

  const isGoogleSignInPending =
    isRequestingGoogleCredential || googleAuthMutation.isPending;

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
        disabled={
          loginMutation.isPending ||
          isGoogleSignInPending ||
          retryAfterCountdown.isActive
        }
        loading={loginMutation.isPending}
        title={
          retryAfterCountdown.isActive
            ? `Try again in ${formatRetryAfterDuration(
                retryAfterCountdown.remainingSeconds,
              )}`
            : "Log in"
        }
        onPress={handleSubmit}
      />

      {googleSignInSupported ? (
        <>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            accessibilityLabel="Continue with Google"
            disabled={
              loginMutation.isPending ||
              isGoogleSignInPending ||
              retryAfterCountdown.isActive
            }
            loading={isGoogleSignInPending}
            title="Continue with Google"
            variant="secondary"
            onPress={handleGoogleSignIn}
          />
        </>
      ) : null}

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
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  dividerLine: {
    height: 1,
    flex: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: typography.weights.medium,
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
