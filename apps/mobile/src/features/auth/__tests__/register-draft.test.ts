/// <reference types="jest" />

import {
  buildRegisterRequest,
  clearRegisterDraft,
  getRegisterDraft,
  isCompleteRegisterDraft,
  saveRegisterDraft,
  saveRegisterLanguagePair,
} from "../register-draft";

const credentialsDraft = {
  displayName: "Yamil Test",
  email: "user@example.com",
  password: "password",
};

describe("register-draft", () => {
  beforeEach(() => {
    clearRegisterDraft();
  });

  afterEach(() => {
    clearRegisterDraft();
  });

  it("stores the validated registration fields", () => {
    saveRegisterDraft(credentialsDraft);

    expect(getRegisterDraft()).toEqual(credentialsDraft);
  });

  it("does not add a language pair when no draft exists", () => {
    expect(saveRegisterLanguagePair("pair-1")).toBeNull();
    expect(getRegisterDraft()).toBeNull();
  });

  it("adds the selected language pair without losing registration fields", () => {
    saveRegisterDraft(credentialsDraft);

    expect(saveRegisterLanguagePair("pair-1")).toEqual({
      ...credentialsDraft,
      languagePairId: "pair-1",
    });
    expect(getRegisterDraft()).toEqual({
      ...credentialsDraft,
      languagePairId: "pair-1",
    });
  });

  it("replaces the selected language pair when the user changes it", () => {
    saveRegisterDraft({
      ...credentialsDraft,
      languagePairId: "pair-1",
    });

    expect(saveRegisterLanguagePair("pair-2")).toEqual({
      ...credentialsDraft,
      languagePairId: "pair-2",
    });
  });

  it("does not build an API request from an incomplete draft", () => {
    saveRegisterDraft(credentialsDraft);

    const draft = getRegisterDraft();

    expect(isCompleteRegisterDraft(draft)).toBe(false);
    expect(buildRegisterRequest(draft)).toBeNull();
  });

  it("builds the register API request from a complete draft", () => {
    saveRegisterDraft(credentialsDraft);
    const draft = saveRegisterLanguagePair("pair-1");

    expect(isCompleteRegisterDraft(draft)).toBe(true);
    expect(buildRegisterRequest(draft)).toEqual({
      email: "user@example.com",
      password: "password",
      displayName: "Yamil Test",
      languagePairId: "pair-1",
    });
  });

  it("removes the draft after the flow is completed or cancelled", () => {
    saveRegisterDraft(credentialsDraft);

    clearRegisterDraft();

    expect(getRegisterDraft()).toBeNull();
  });
});
