import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Swipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";

import { colors, spacing, typography } from "@/shared/theme";

type SwipeableDeckWordRowProps = {
  children: ReactNode;
  disabled?: boolean;
  onDeleteRequest: () => void;
  wordLabel: string;
};

export function SwipeableDeckWordRow({
  children,
  disabled = false,
  onDeleteRequest,
  wordLabel,
}: SwipeableDeckWordRowProps) {
  return (
    <Swipeable
      enableTrackpadTwoFingerGesture
      enabled={!disabled}
      friction={1.6}
      overshootRight={false}
      rightThreshold={36}
      containerStyle={styles.container}
      childrenContainerStyle={styles.children}
      renderRightActions={(_progress, _translation, methods) => (
        <DeleteAction
          disabled={disabled}
          methods={methods}
          wordLabel={wordLabel}
          onDeleteRequest={onDeleteRequest}
        />
      )}
    >
      {children}
    </Swipeable>
  );
}

type DeleteActionProps = {
  disabled: boolean;
  methods: SwipeableMethods;
  onDeleteRequest: () => void;
  wordLabel: string;
};

function DeleteAction({
  disabled,
  methods,
  onDeleteRequest,
  wordLabel,
}: DeleteActionProps) {
  return (
    <View style={styles.actionBackground}>
      <Pressable
        accessibilityLabel={`Remove ${wordLabel} from this deck`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        style={({ pressed }) => [
          styles.deleteButton,
          pressed ? styles.pressed : null,
        ]}
        onPress={() => {
          methods.close();
          onDeleteRequest();
        }}
      >
        <Ionicons name="trash-outline" size={21} color={colors.white} />
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#C93439",
  },
  children: {
    backgroundColor: colors.white,
  },
  actionBackground: {
    width: 92,
    backgroundColor: "#C93439",
  },
  deleteButton: {
    flex: 1,
    minHeight: 76,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  deleteText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: typography.weights.black,
  },
  pressed: {
    opacity: 0.72,
  },
});
