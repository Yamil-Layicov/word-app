import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/shared/theme";

type HomeHeaderProps = {
  subtitle: string;
  title: string;
};

export function HomeHeader({ subtitle, title }: HomeHeaderProps) {
  return (
    <>
      <View style={styles.logoBox}>
        <Text style={styles.logoText}>W</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy,
  },
  logoText: {
    color: colors.white,
    fontSize: 30,
    fontWeight: typography.weights.black,
  },
  title: {
    marginTop: spacing.lg,
    color: colors.navy,
    fontSize: 28,
    fontWeight: typography.weights.black,
  },
  subtitle: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: typography.weights.medium,
    textAlign: "center",
  },
});
