import { Ionicons } from "@expo/vector-icons";
import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

import { appBrand } from "@/shared/config/brand";
import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "@/shared/theme";

type AuthScreenScaffoldProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  variant?: "login" | "register";
}>;

export function AuthScreenScaffold({
  title,
  subtitle,
  variant = "login",
  children,
}: AuthScreenScaffoldProps) {
  return (
    <ScreenContainer backgroundColor={colors.backgroundWarm} contentStyle={styles.content}>
      <View style={styles.brandRow}>
        <View style={styles.logoMark}>
          <Ionicons name="book-outline" size={29} color={colors.white} />
        </View>
        <Text style={styles.brandName}>{appBrand.name}</Text>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroHalo} />
        <View style={[styles.spark, styles.sparkLeft]} />
        <View style={[styles.spark, styles.sparkRight]} />
        <View style={styles.avatarHead}>
          <Ionicons
            name={variant === "login" ? "person-outline" : "school-outline"}
            size={56}
            color={colors.navy}
          />
        </View>
        <View style={styles.avatarBody} />
        <View style={[styles.sideShape, styles.sideShapeLeft]} />
        <View style={[styles.sideShape, styles.sideShapeRight]} />
      </View>

      <View style={styles.heading}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.form}>{children}</View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 3,
  },
  brandName: {
    color: colors.navy,
    fontSize: 39,
    fontWeight: typography.weights.black,
  },
  hero: {
    height: 260,
    marginTop: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  heroHalo: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: radii.pill,
    backgroundColor: "#F8EBD8",
  },
  avatarHead: {
    width: 124,
    height: 124,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE1C3",
    borderWidth: 3,
    borderColor: colors.white,
    zIndex: 2,
  },
  avatarBody: {
    width: 176,
    height: 76,
    marginTop: -18,
    borderTopLeftRadius: 56,
    borderTopRightRadius: 56,
    backgroundColor: "#78A957",
    zIndex: 1,
  },
  spark: {
    position: "absolute",
    width: 11,
    height: 11,
    borderRadius: radii.pill,
    backgroundColor: colors.orange,
  },
  sparkLeft: {
    left: "18%",
    top: 72,
  },
  sparkRight: {
    right: "18%",
    top: 92,
    backgroundColor: "#A9C88F",
  },
  sideShape: {
    position: "absolute",
    bottom: 26,
    width: 58,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: "#E8D8C2",
  },
  sideShapeLeft: {
    left: "12%",
  },
  sideShapeRight: {
    right: "12%",
  },
  heading: {
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    color: colors.navy,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: typography.weights.black,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: typography.weights.medium,
    textAlign: "center",
  },
  form: {
    gap: spacing.lg,
  },
});
