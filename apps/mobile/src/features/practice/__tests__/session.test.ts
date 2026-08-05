/// <reference types="jest" />

import {
  buildPracticeChoiceOptions,
  canStartMatchingSession,
  getPracticeSessionModeLabel,
  parsePracticeSessionMode,
  type PracticeSessionMode,
} from "../session";

describe("practice session helpers", () => {
  it.each([
    ["FLASHCARD", "Flashcards"],
    ["TYPING", "Writing"],
    ["MULTIPLE_CHOICE", "Test"],
    ["MATCHING", "Matching"],
  ] as const)("parses and labels the %s mode", (value, label) => {
    const mode = parsePracticeSessionMode(value);

    expect(mode).toBe(value);
    expect(getPracticeSessionModeLabel(mode as PracticeSessionMode)).toBe(
      label,
    );
  });

  it.each([undefined, "OTHER", "unknown", "matching"])(
    "rejects unsupported session mode %s",
    (value) => {
      expect(parsePracticeSessionMode(value)).toBeUndefined();
    },
  );

  it("requires at least two cards with unique normalized text for matching", () => {
    expect(
      canStartMatchingSession([{ sourceText: "hello", targetText: "salam" }]),
    ).toBe(false);

    expect(
      canStartMatchingSession([
        { sourceText: "hello", targetText: "salam" },
        { sourceText: "book", targetText: "kitab" },
      ]),
    ).toBe(true);
  });

  it("rejects matching cards whose source or target text normalizes to duplicates", () => {
    expect(
      canStartMatchingSession([
        { sourceText: " Hello  world ", targetText: "salam" },
        { sourceText: "hello world", targetText: "kitab" },
      ]),
    ).toBe(false);

    expect(
      canStartMatchingSession([
        { sourceText: "hello", targetText: " Salam " },
        { sourceText: "book", targetText: "salam" },
      ]),
    ).toBe(false);
  });

  it("builds deterministic unique choices with at most three distractors", () => {
    const items = [
      { targetText: "one" },
      { targetText: "two" },
      { targetText: "three" },
      { targetText: "four" },
      { targetText: "five" },
      { targetText: "two" },
    ];

    expect(buildPracticeChoiceOptions(items, 1)).toEqual([
      "one",
      "three",
      "four",
      "two",
    ]);
    expect(new Set(buildPracticeChoiceOptions(items, 1)).size).toBe(4);
  });

  it("returns no choices for an out-of-range card index", () => {
    expect(buildPracticeChoiceOptions([{ targetText: "one" }], 4)).toEqual(
      [],
    );
  });
});
