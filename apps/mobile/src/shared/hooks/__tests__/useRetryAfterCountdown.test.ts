/// <reference types="jest" />

import { act, renderHook } from "@testing-library/react-native";

import {
  calculateRemainingSeconds,
  formatRetryAfterDuration,
  useRetryAfterCountdown,
} from "../useRetryAfterCountdown";

describe("useRetryAfterCountdown", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-29T10:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("counts down from an absolute deadline without accumulating drift", () => {
    const { result } = renderHook(() => useRetryAfterCountdown());

    act(() => {
      result.current.start(65);
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.remainingSeconds).toBe(65);

    act(() => {
      jest.advanceTimersByTime(5_000);
    });

    expect(result.current.remainingSeconds).toBe(60);

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
  });

  it("can be cleared immediately", () => {
    const { result } = renderHook(() => useRetryAfterCountdown());

    act(() => {
      result.current.start(60);
      result.current.clear();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
  });
});

describe("retry-after time helpers", () => {
  it.each([
    { seconds: 0, expected: "0:00" },
    { seconds: 65, expected: "1:05" },
    { seconds: 3_661, expected: "1:01:01" },
  ])("formats $seconds seconds as $expected", ({ seconds, expected }) => {
    expect(formatRetryAfterDuration(seconds)).toBe(expected);
  });

  it("rounds a partial remaining second up", () => {
    expect(calculateRemainingSeconds(10_001, 10_000)).toBe(1);
    expect(calculateRemainingSeconds(9_999, 10_000)).toBe(0);
  });
});
