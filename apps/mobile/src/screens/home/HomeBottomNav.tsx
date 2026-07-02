import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "@/shared/theme";

type HomeBottomNavItem = {
  active?: boolean;
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
};

const HOME_BOTTOM_NAV_ITEMS = [
  {
    label: "Home",
    href: "/(app)",
    icon: "home-outline",
    activeIcon: "home",
    active: true,
  },
  {
    label: "Decks",
    href: "/vocabulary",
    icon: "albums-outline",
    activeIcon: "albums",
  },
  {
    label: "Study",
    href: "/practice",
    icon: "book-outline",
    activeIcon: "book",
  },
  {
    label: "Progress",
    href: "/review",
    icon: "stats-chart-outline",
    activeIcon: "stats-chart",
  },
  {
    label: "Profile",
    href: "/profile",
    icon: "person-outline",
    activeIcon: "person",
  },
] satisfies HomeBottomNavItem[];

export function HomeBottomNav() {
  const router = useRouter();

  return (
    <View style={styles.footer}>
      <View style={styles.navBar}>
        {HOME_BOTTOM_NAV_ITEMS.map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityState={{ selected: item.active }}
            style={({ pressed }) => [styles.navItem, pressed ? styles.pressed : null]}
            onPress={() => {
              if (!item.active) {
                router.push(item.href);
              }
            }}
          >
            <View style={[styles.iconShell, item.active ? styles.activeIconShell : null]}>
              <Ionicons
                name={item.active ? item.activeIcon : item.icon}
                size={22}
                color={item.active ? colors.orange : colors.textMuted}
              />
            </View>
            <Text style={[styles.navLabel, item.active ? styles.activeNavLabel : null]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  navBar: {
    width: "100%",
    maxWidth: 420,
    minHeight: 76,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.09,
    shadowRadius: 24,
    elevation: 6,
  },
  navItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  iconShell: {
    width: 34,
    height: 30,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  activeIconShell: {
    backgroundColor: colors.orangeSoft,
  },
  navLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: typography.weights.semibold,
  },
  activeNavLabel: {
    color: colors.orange,
    fontWeight: typography.weights.black,
  },
  pressed: {
    opacity: 0.72,
  },
});
