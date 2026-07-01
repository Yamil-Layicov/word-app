import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AuthScreenScaffold } from "@/shared/layout/AuthScreenScaffold";
import { colors, spacing, typography } from "@/shared/theme";
import { Button, Checkbox, PasswordField, TextField } from "@/shared/ui";

type RegisterErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
};

function isEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

export function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});

  const handleSubmit = () => {
    const nextErrors: RegisterErrors = {};

    if (!fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    }

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

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirm your password.";
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    if (!acceptedTerms) {
      nextErrors.terms = "You need to accept the terms to continue.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      router.push("/language-pair");
    }
  };

  return (
    <AuthScreenScaffold
      title="Create account"
      subtitle="Join Word App and start learning new words with smart flashcards."
      variant="register"
    >
      <View style={styles.fields}>
        <TextField
          autoCapitalize="words"
          autoComplete="name"
          error={errors.fullName}
          icon="person-outline"
          placeholder="Full name"
          textContentType="name"
          value={fullName}
          onChangeText={(value) => {
            setFullName(value);
            setErrors((current) => ({ ...current, fullName: undefined }));
          }}
        />

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

        <PasswordField
          error={errors.confirmPassword}
          placeholder="Confirm password"
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            setErrors((current) => ({ ...current, confirmPassword: undefined }));
          }}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        style={styles.termsRow}
        onPress={() => {
          setAcceptedTerms((value) => !value);
          setErrors((current) => ({ ...current, terms: undefined }));
        }}
      >
        <Checkbox
          accessibilityLabel="Accept terms"
          checked={acceptedTerms}
          onChange={(checked) => {
            setAcceptedTerms(checked);
            setErrors((current) => ({ ...current, terms: undefined }));
          }}
        />
        <Text style={styles.termsText}>
          I agree to the Word App <Text style={styles.termsLink}>Terms of Service</Text>{" "}
          and <Text style={styles.termsLink}>Privacy Policy</Text>.
        </Text>
      </Pressable>
      {errors.terms ? <Text style={styles.termsError}>{errors.terms}</Text> : null}

      <Button title="Create account" onPress={handleSubmit} />

      <Text style={styles.footerText}>
        Already have an account?{" "}
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
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  termsText: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: typography.weights.medium,
  },
  termsLink: {
    color: colors.orange,
    fontWeight: typography.weights.bold,
  },
  termsError: {
    marginTop: -spacing.sm,
    color: colors.error,
    fontSize: 12,
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
