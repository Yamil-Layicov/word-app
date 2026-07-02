import type { MeProfile } from "@/entities/user";

type HomeSummaryInput = {
  profile: MeProfile | undefined;
};

export function getHomeSummary({ profile }: HomeSummaryInput) {
  return {
    activePairCodeLabel: getActivePairCodeLabel(profile?.activeLanguagePair),
  };
}

function getActivePairCodeLabel(activeLanguagePair: MeProfile["activeLanguagePair"] | undefined) {
  if (!activeLanguagePair) {
    return "Pair";
  }

  return `${activeLanguagePair.sourceLanguage.code.toUpperCase()} -> ${activeLanguagePair.targetLanguage.code.toUpperCase()}`;
}
