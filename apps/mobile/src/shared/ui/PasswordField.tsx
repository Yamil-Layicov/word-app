import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, type TextInputProps } from "react-native";

import { colors, radii } from "@/shared/theme";
import { TextField } from "@/shared/ui/TextField";

type PasswordFieldProps = Omit<TextInputProps, "secureTextEntry"> & {
  label?: string;
  error?: string;
};

export function PasswordField(props: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <TextField
      autoCapitalize="none"
      autoCorrect={false}
      icon="lock-closed-outline"
      secureTextEntry={!isVisible}
      textContentType="password"
      rightElement={
        <Pressable
          accessibilityLabel={isVisible ? "Hide password" : "Show password"}
          accessibilityRole="button"
          hitSlop={10}
          style={styles.iconButton}
          onPress={() => setIsVisible((value) => !value)}
        >
          <Ionicons
            name={isVisible ? "eye-off-outline" : "eye-outline"}
            size={24}
            color={colors.textMuted}
          />
        </Pressable>
      }
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
