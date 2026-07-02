import { type Href, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { useLogout } from "@/features/auth";
import { spacing } from "@/shared/theme";
import { Button } from "@/shared/ui";

type HomeRouteAction = {
  href: Href;
  title: string;
  variant: "primary" | "secondary";
};

const HOME_ROUTE_ACTIONS = [
  { title: "Review due words", href: "./review", variant: "primary" },
  { title: "Practice flashcards", href: "/practice", variant: "secondary" },
  { title: "View vocabulary", href: "/vocabulary", variant: "secondary" },
  { title: "View profile", href: "/profile", variant: "secondary" },
] satisfies HomeRouteAction[];

export function HomeActions() {
  const logout = useLogout();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <View style={styles.actions}>
      {HOME_ROUTE_ACTIONS.map((action) => (
        <Button
          key={action.title}
          title={action.title}
          variant={action.variant}
          style={styles.actionButton}
          onPress={() => router.push(action.href)}
        />
      ))}
      <Button title="Log out" variant="secondary" style={styles.logoutButton} onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    width: "100%",
    maxWidth: 360,
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  actionButton: {
    width: "100%",
  },
  logoutButton: {
    width: "100%",
  },
});
