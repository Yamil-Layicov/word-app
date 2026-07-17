import { useLocalSearchParams } from "expo-router";

import { MasteredWordsScreen } from "@/screens/mastered-collections/MasteredWordsScreen";
import { ReviewBoxDetailScreen } from "@/screens/review-boxes/ReviewBoxDetailScreen";

export default function ReviewBoxRoute() {
  const params = useLocalSearchParams<{ boxId?: string | string[] }>();
  const boxId = Array.isArray(params.boxId) ? params.boxId[0] : params.boxId;

  if (boxId === "mastered") {
    return <MasteredWordsScreen />;
  }

  return <ReviewBoxDetailScreen boxId={boxId} />;
}
