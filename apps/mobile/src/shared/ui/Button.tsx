import type { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, radii, typography } from "@/shared/theme";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = PropsWithChildren<{
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}> &
  Omit<PressableProps, "children" | "style">;

export function Button({
  title,
  variant = "primary",
  loading = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" ? styles.primary : styles.secondary,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.white : colors.orange} />
      ) : (
        <Text
          style={[
            styles.text,
            variant === "primary" ? styles.primaryText : styles.secondaryText,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 58,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primary: {
    backgroundColor: colors.orange,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 3,
  },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.56,
  },
  text: {
    fontSize: 17,
    fontWeight: typography.weights.bold,
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.orange,
  },
});
