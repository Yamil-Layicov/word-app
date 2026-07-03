import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { appBrand } from "@/shared/config/brand";
import { colors, radii, spacing, typography } from "@/shared/theme";

type HomeTopBarProps = {
  activePairCodeLabel: string;
};

const DRAWER_ITEMS = [
  { icon: "add-outline", label: "Add language" },
  { icon: "remove-outline", label: "Delete language" },
  { icon: "download-outline", label: "Import" },
  { icon: "cloud-upload-outline", label: "Export" },
  { icon: "bar-chart-outline", label: "Statistics" },
  { icon: "color-palette-outline", label: "Themes" },
  { icon: "settings-outline", label: "Settings" },
] as const;

export function HomeTopBar({ activePairCodeLabel }: HomeTopBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <View style={styles.topBar}>
        <IconButton
          accessibilityLabel="Open menu"
          icon="menu-outline"
          onPress={() => setIsMenuOpen(true)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change language pair"
          style={({ pressed }) => [styles.languageButton, pressed ? styles.pressed : null]}
          onPress={() => Alert.alert("Coming soon", "Language pair switcher will be added next.")}
        >
          <Ionicons name="language-outline" size={18} color={colors.navy} />
          <Text numberOfLines={1} style={styles.languageText}>
            {activePairCodeLabel}
          </Text>
          <Ionicons name="chevron-down-outline" size={16} color={colors.textMuted} />
        </Pressable>
        <MetricButton
          accessibilityLabel="View daily streak"
          icon="flame-outline"
          value="0"
          tone="orange"
          onPress={() => Alert.alert("Coming soon", "Daily streak details will be added later.")}
        />
        <MetricButton
          accessibilityLabel="View rewards and events"
          icon="diamond-outline"
          value="0"
          tone="blue"
          onPress={() => Alert.alert("Coming soon", "Rewards and special events will be added later.")}
        />
        <IconButton
          accessibilityLabel="Open top action"
          icon="ellipsis-horizontal-circle-outline"
          onPress={() => Alert.alert("Coming soon", "This action will be defined later.")}
        />
      </View>

      <HomeMenuDrawer visible={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
}

type IconButtonProps = {
  accessibilityLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function IconButton({ accessibilityLabel, icon, onPress }: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={22} color={colors.navy} />
    </Pressable>
  );
}

type MetricButtonProps = {
  accessibilityLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone: "blue" | "orange";
  value: string;
};

function MetricButton({ accessibilityLabel, icon, onPress, tone, value }: MetricButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [styles.metricButton, pressed ? styles.pressed : null]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={18}
        color={tone === "orange" ? colors.orange : colors.navySoft}
      />
      <Text style={styles.metricValue}>{value}</Text>
    </Pressable>
  );
}

type HomeMenuDrawerProps = {
  onClose: () => void;
  visible: boolean;
};

function HomeMenuDrawer({ onClose, visible }: HomeMenuDrawerProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.drawerLayer}>
        <Pressable
          accessibilityLabel="Close menu"
          accessibilityRole="button"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={styles.drawerPanel}>
          <View style={styles.drawerHeader}>
            <View style={styles.drawerLogo}>
              <Text style={styles.drawerLogoText}>W</Text>
            </View>
            <View style={styles.drawerHeaderText}>
              <Text style={styles.drawerTitle}>{appBrand.name}</Text>
              <Text style={styles.drawerSubtitle}>Activity today</Text>
            </View>
          </View>

          <View style={styles.activityRow}>
            <View style={styles.activityItem}>
              <Ionicons name="timer-outline" size={24} color={colors.orange} />
              <Text style={styles.activityValue}>00:00</Text>
              <Text style={styles.activityLabel}>Study time</Text>
            </View>
            <View style={styles.activityDivider} />
            <View style={styles.activityItem}>
              <Ionicons name="document-text-outline" size={24} color={colors.green} />
              <Text style={styles.activityValue}>0 words</Text>
              <Text style={styles.activityLabel}>Learned</Text>
            </View>
          </View>

          <View style={styles.drawerList}>
            {DRAWER_ITEMS.map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                style={({ pressed }) => [styles.drawerItem, pressed ? styles.pressed : null]}
                onPress={() => Alert.alert("Coming soon", `${item.label} will be connected later.`)}
              >
                <View style={styles.drawerItemIcon}>
                  <Ionicons name={item.icon} size={22} color={colors.textMuted} />
                </View>
                <Text style={styles.drawerItemText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  topBar: {
    width: "100%",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  languageButton: {
    flex: 1,
    minWidth: 0,
    height: 38,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  languageText: {
    minWidth: 0,
    color: colors.navy,
    fontSize: 13,
    fontWeight: typography.weights.black,
  },
  metricButton: {
    height: 38,
    minWidth: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: spacing.sm,
  },
  metricValue: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: typography.weights.black,
  },
  pressed: {
    opacity: 0.72,
  },
  drawerLayer: {
    flex: 1,
    backgroundColor: "rgba(8, 29, 51, 0.42)",
  },
  drawerPanel: {
    width: "78%",
    maxWidth: 330,
    minHeight: "100%",
    borderTopRightRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    backgroundColor: colors.backgroundSoft,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  drawerLogo: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy,
  },
  drawerLogoText: {
    color: colors.white,
    fontSize: 23,
    fontWeight: typography.weights.black,
  },
  drawerHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  drawerTitle: {
    color: colors.navy,
    fontSize: 21,
    fontWeight: typography.weights.black,
  },
  drawerSubtitle: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: typography.weights.semibold,
  },
  activityRow: {
    minHeight: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.lg,
  },
  activityItem: {
    flex: 1,
    alignItems: "center",
  },
  activityDivider: {
    width: 1,
    height: 54,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  activityValue: {
    marginTop: spacing.xs,
    color: colors.navy,
    fontSize: 18,
    fontWeight: typography.weights.black,
  },
  activityLabel: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: typography.weights.medium,
  },
  drawerList: {
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  drawerItem: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
  },
  drawerItemIcon: {
    width: 34,
    alignItems: "center",
  },
  drawerItemText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: typography.weights.semibold,
  },
});
