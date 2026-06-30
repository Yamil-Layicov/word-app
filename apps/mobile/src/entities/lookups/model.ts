export type Country = {
  id: string;
  code: string;
  name: string;
  emoji: string | null;
};

export type Language = {
  id: string;
  code: string;
  name: string;
  nativeName: string;
};

export type LanguagePair = {
  id: string;
  sourceLanguage: Language;
  targetLanguage: Language;
};
