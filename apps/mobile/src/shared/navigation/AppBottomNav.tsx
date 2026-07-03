import { Ionicons } from "@expo/vector-icons";
import { type Href, usePathname, useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing, typography } from "@/shared/theme";

const ANDROID_BOTTOM_NAV_OFFSET = 56;

type AppBottomNavItem = {
  activeIcon: keyof typeof Ionicons.glyphMap;
  color: string;
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  pathPrefix: string;
};

const APP_BOTTOM_NAV_ITEMS = [
  {
    label: "Home",
    href: "/(app)",
    pathPrefix: "/",
    icon: "home-outline",
    activeIcon: "home",
    color: "#FF6416",
  },
  {
    label: "Decks",
    href: "/vocabulary",
    pathPrefix: "/vocabulary",
    icon: "albums-outline",
    activeIcon: "albums",
    color: "#D79B00",
  },
  {
    label: "Study",
    href: "/practice",
    pathPrefix: "/practice",
    icon: "book-outline",
    activeIcon: "book",
    color: "#4E87C8",
  },
  {
    label: "Progress",
    href: "/review",
    pathPrefix: "/review",
    icon: "stats-chart-outline",
    activeIcon: "stats-chart",
    color: "#7E8CA3",
  },
  {
    label: "Profile",
    href: "/profile",
    pathPrefix: "/profile",
    icon: "person-outline",
    activeIcon: "person",
    color: "#5BAEE8",
  },
] satisfies AppBottomNavItem[];

export function AppBottomNav() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const bottomPadding = Math.max(
    insets.bottom,
    Platform.OS === "android" ? ANDROID_BOTTOM_NAV_OFFSET : spacing.sm,
  );

  return (
    <View style={[styles.footer, { paddingBottom: bottomPadding }]}>
      <View style={styles.navBar}>
        {APP_BOTTOM_NAV_ITEMS.map((item) => {
          const isActive = isActiveRoute(pathname, item.pathPrefix);

          return (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={({ pressed }) => [styles.navItem, pressed ? styles.pressed : null]}
              onPress={() => {
                if (!isActive) {
                  router.push(item.href);
                }
              }}
            >
              <View style={styles.iconShell}>
                <Ionicons
                  name={isActive ? item.activeIcon : item.icon}
                  size={24}
                  color={item.color}
                />
              </View>
              <Text
                style={[
                  styles.navLabel,
                  isActive ? [styles.activeNavLabel, { color: item.color }] : null,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function isActiveRoute(pathname: string, pathPrefix: string) {
  if (pathPrefix === "/") {
    return pathname === "/" || pathname === "/(app)";
  }

  return pathname === pathPrefix || pathname.startsWith(`${pathPrefix}/`);
}

const styles = StyleSheet.create({
  footer: {
    width: "100%",
    backgroundColor: colors.backgroundWarm,
  },
  navBar: {
    width: "100%",
    minHeight: 66,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  navItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  iconShell: {
    width: 40,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: typography.weights.semibold,
  },
  activeNavLabel: {
    fontWeight: typography.weights.black,
  },
  pressed: {
    opacity: 0.72,
  },
});
