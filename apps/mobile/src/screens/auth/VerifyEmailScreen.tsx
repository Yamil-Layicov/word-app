import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";

import {
  AUTH_ROUTE_NOTICE,
  isValidEmailVerificationToken,
  useConfirmEmailVerification,
  useRequestEmailVerification,
} from "@/features/auth";
import { getApiRetryAfterSeconds, isApiError } from "@/shared/api/http-error";
import {
  formatRetryAfterDuration,
  useRetryAfterCountdown,
} from "@/shared/hooks/useRetryAfterCountdown";
import { AuthScreenScaffold } from "@/shared/layout/AuthScreenScaffold";
import { colors, spacing, typography } from "@/shared/theme";
import { Button } from "@/shared/ui";

const INVALID_LINK_MESSAGE =
  "This email verification link is invalid or incomplete.";

export function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string | string[];
    token?: string | string[];
  }>();
  const confirmEmailMutation = useConfirmEmailVerification();
  const requestEmailMutation = useRequestEmailVerification();
  const retryAfterCountdown = useRetryAfterCountdown();
  const confirmationStarted = useRef(false);
  const email = normalizeEmail(getFirstParam(params.email));
  const token = getFirstParam(params.token).trim();
  const isConfirmationLink = token.length > 0;
  const hasValidToken = isValidEmailVerificationToken(token);
  const [notice, setNotice] = useState<string | null>(() =>
    isConfirmationLink && !hasValidToken ? INVALID_LINK_MESSAGE : null,
  );
  const [noticeType, setNoticeType] = useState<"success" | "error">(
    isConfirmationLink && !hasValidToken ? "error" : "success",
  );

  const handleConfirm = useCallback(async () => {
    setNotice(null);

    try {
      await confirmEmailMutation.mutateAsync({ token });
      router.replace({
        pathname: "/login",
        params: {
          notice: AUTH_ROUTE_NOTICE.emailVerified,
        },
      });
    } catch (error) {
      setNoticeType("error");
      setNotice(
        isApiError(error) ? error.message : "Could not verify your email.",
      );
    }
  }, [confirmEmailMutation, router, token]);

  useEffect(() => {
    if (!hasValidToken || confirmationStarted.current) {
      return;
    }

    confirmationStarted.current = true;
    void handleConfirm();
  }, [handleConfirm, hasValidToken]);

  const handleResend = async () => {
    if (!email || retryAfterCountdown.isActive) {
      return;
    }

    setNotice(null);

    try {
      const response = await requestEmailMutation.mutateAsync({ email });

      setNoticeType("success");
      setNotice(response.message);
    } catch (error) {
      const retryAfterSeconds = getApiRetryAfterSeconds(error);

      if (retryAfterSeconds !== null) {
        retryAfterCountdown.start(retryAfterSeconds);
      }

      setNoticeType("error");
      setNotice(
        isApiError(error)
          ? error.message
          : "Could not send a verification email.",
      );
    }
  };

  return (
    <AuthScreenScaffold
      title={isConfirmationLink ? "Verify your email" : "Check your email"}
      subtitle={
        isConfirmationLink
          ? "We are confirming your email address."
          : email
            ? `We sent a verification link to ${email}.`
            : "Open the verification link from your email to continue."
      }
      variant="recovery"
    >
      {hasValidToken && !notice ? (
        <>
          <ActivityIndicator
            accessibilityLabel="Verifying email"
            color={colors.orange}
            size="large"
          />
          <Text style={styles.statusText}>Verifying your email...</Text>
        </>
      ) : null}

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

      {hasValidToken && noticeType === "error" && notice ? (
        <Button
          disabled={confirmEmailMutation.isPending}
          loading={confirmEmailMutation.isPending}
          title="Try again"
          variant="secondary"
          onPress={handleConfirm}
        />
      ) : null}

      {!isConfirmationLink && email ? (
        <Button
          disabled={
            requestEmailMutation.isPending || retryAfterCountdown.isActive
          }
          loading={requestEmailMutation.isPending}
          title={
            retryAfterCountdown.isActive
              ? `Try again in ${formatRetryAfterDuration(
                  retryAfterCountdown.remainingSeconds,
                )}`
              : "Resend verification email"
          }
          variant="secondary"
          onPress={handleResend}
        />
      ) : null}

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

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

const styles = StyleSheet.create({
  statusText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: typography.weights.medium,
    textAlign: "center",
    marginTop: -spacing.sm,
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
