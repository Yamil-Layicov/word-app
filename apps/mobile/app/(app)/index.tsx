import { StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { appBrand } from "@/shared/config/brand";
import { colors, spacing, typography } from "@/shared/theme";

export default function AppHomeRoute() {
  return (
    <ScreenContainer backgroundColor={colors.backgroundWarm}>
      <View style={styles.content}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>W</Text>
        </View>
        <Text style={styles.title}>{appBrand.name}</Text>
        <Text style={styles.subtitle}>App shell placeholder</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
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
  },
});
