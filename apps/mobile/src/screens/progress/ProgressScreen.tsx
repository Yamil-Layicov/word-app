import { ScreenContainer } from "@/shared/layout/ScreenContainer";
import { colors } from "@/shared/theme";

export function ProgressScreen() {
  return (
    <ScreenContainer
      backgroundColor={colors.backgroundWarm}
      scroll={false}
    />
  );
}
