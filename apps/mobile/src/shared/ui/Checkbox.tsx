import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";

import { colors, radii } from "@/shared/theme";

type CheckboxProps = {
  checked: boolean;
  accessibilityLabel: string;
  onChange: (checked: boolean) => void;
};

export function Checkbox({ checked, accessibilityLabel, onChange }: CheckboxProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={8}
      style={[styles.box, checked ? styles.boxChecked : null]}
      onPress={() => onChange(!checked)}
    >
      {checked ? <Ionicons name="checkmark" size={25} color={colors.green} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundSoft,
  },
  boxChecked: {
    borderColor: colors.green,
  },
});
