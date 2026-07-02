import type { MeProfile } from "@/entities/user";

type HomeSummaryInput = {
  isProfileLoading: boolean;
  languagePairCount: number;
  profile: MeProfile | undefined;
};

export function getHomeSummary({
  isProfileLoading,
  languagePairCount,
  profile,
}: HomeSummaryInput) {
  return {
    activePairCodeLabel: getActivePairCodeLabel(profile?.activeLanguagePair),
    activePairLabel: getActivePairLabel(profile?.activeLanguagePair),
    headerSubtitle: getHeaderSubtitle(profile, isProfileLoading),
    languagePairCount,
  };
}

function getHeaderSubtitle(profile: MeProfile | undefined, isLoading: boolean) {
  if (isLoading) {
    return "Loading your profile...";
  }

  const userLabel = profile?.profile?.displayName || profile?.email;

  if (userLabel) {
    return `Signed in as ${userLabel}`;
  }

  return "App shell placeholder";
}

function getActivePairLabel(activeLanguagePair: MeProfile["activeLanguagePair"] | undefined) {
  if (!activeLanguagePair) {
    return "No active language pair yet";
  }

  return `${activeLanguagePair.sourceLanguage.name} -> ${activeLanguagePair.targetLanguage.name}`;
}

function getActivePairCodeLabel(activeLanguagePair: MeProfile["activeLanguagePair"] | undefined) {
  if (!activeLanguagePair) {
    return "Pair";
  }

  return `${activeLanguagePair.sourceLanguage.code.toUpperCase()} -> ${activeLanguagePair.targetLanguage.code.toUpperCase()}`;
}
