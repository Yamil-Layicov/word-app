import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  View,
  type TextInputProps as NativeTextInputProps,
} from "react-native";

import { colors, radii, spacing, typography } from "@/shared/theme";

type IconName = keyof typeof Ionicons.glyphMap;

type TextFieldProps = NativeTextInputProps & {
  label?: string;
  icon?: IconName;
  error?: string;
  rightElement?: React.ReactNode;
};

export function TextField({
  label,
  icon,
  error,
  rightElement,
  style,
  ...props
}: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputShell, error ? styles.inputShellError : null]}>
        {icon ? <Ionicons name={icon} size={22} color={colors.textMuted} /> : null}
        <NativeTextInput
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.orange}
          style={[styles.input, style]}
          {...props}
        />
        {rightElement}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: typography.weights.semibold,
  },
  inputShell: {
    minHeight: 62,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  inputShellError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 17,
    fontWeight: typography.weights.medium,
    paddingVertical: spacing.md,
  },
  error: {
    color: colors.error,
    fontSize: 12,
    fontWeight: typography.weights.medium,
  },
});
