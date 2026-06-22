import type { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type ScreenContainerProps = PropsWithChildren<{
  scroll?: boolean;
  backgroundColor?: string;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function ScreenContainer({
  children,
  scroll = true,
  backgroundColor = "#FFFFFF",
  contentStyle,
}: ScreenContainerProps) {
  if (scroll) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboard}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, contentStyle]}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
