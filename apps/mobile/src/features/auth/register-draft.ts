export type RegisterDraft = {
  displayName: string;
  email: string;
  password: string;
};

let registerDraft: RegisterDraft | null = null;

export function saveRegisterDraft(draft: RegisterDraft) {
  registerDraft = draft;
}

export function getRegisterDraft() {
  return registerDraft;
}

export function clearRegisterDraft() {
  registerDraft = null;
}
