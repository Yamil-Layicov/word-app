export type RegisterDraft = {
  displayName: string;
  email: string;
  password: string;
  languagePairId?: string;
};

export type CompleteRegisterDraft = RegisterDraft & {
  languagePairId: string;
};

let registerDraft: RegisterDraft | null = null;

export function saveRegisterDraft(draft: RegisterDraft) {
  registerDraft = draft;
}

export function getRegisterDraft() {
  return registerDraft;
}

export function saveRegisterLanguagePair(languagePairId: string) {
  if (!registerDraft) {
    return null;
  }

  registerDraft = {
    ...registerDraft,
    languagePairId,
  };

  return registerDraft;
}

export function isCompleteRegisterDraft(
  draft: RegisterDraft | null,
): draft is CompleteRegisterDraft {
  return Boolean(draft?.languagePairId);
}

export function clearRegisterDraft() {
  registerDraft = null;
}
