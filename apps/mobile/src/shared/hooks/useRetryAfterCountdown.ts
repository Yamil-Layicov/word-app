import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

export function useRetryAfterCountdown() {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (deadline === null) {
      return;
    }

    const synchronize = () => {
      const nextRemainingSeconds = calculateRemainingSeconds(
        deadline,
        Date.now(),
      );

      setRemainingSeconds(nextRemainingSeconds);

      if (nextRemainingSeconds === 0) {
        setDeadline((currentDeadline) =>
          currentDeadline === deadline ? null : currentDeadline,
        );
      }
    };

    synchronize();

    const interval = setInterval(synchronize, 1_000);
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active") {
          synchronize();
        }
      },
    );

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [deadline]);

  const start = useCallback((seconds: number) => {
    const durationSeconds = normalizeDurationSeconds(seconds);

    setRemainingSeconds(durationSeconds);
    setDeadline(Date.now() + durationSeconds * 1_000);
  }, []);

  const clear = useCallback(() => {
    setDeadline(null);
    setRemainingSeconds(0);
  }, []);

  return {
    clear,
    isActive: remainingSeconds > 0,
    remainingSeconds,
    start,
  };
}

export function formatRetryAfterDuration(totalSeconds: number): string {
  const normalizedSeconds = Math.max(0, Math.ceil(totalSeconds));
  const hours = Math.floor(normalizedSeconds / 3_600);
  const minutes = Math.floor((normalizedSeconds % 3_600) / 60);
  const seconds = normalizedSeconds % 60;

  if (hours > 0) {
    return `${hours}:${padTimePart(minutes)}:${padTimePart(seconds)}`;
  }

  return `${minutes}:${padTimePart(seconds)}`;
}

export function calculateRemainingSeconds(
  deadline: number,
  now: number,
): number {
  return Math.max(0, Math.ceil((deadline - now) / 1_000));
}

function normalizeDurationSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) {
    return 1;
  }

  return Math.max(1, Math.ceil(seconds));
}

function padTimePart(value: number): string {
  return String(value).padStart(2, "0");
}
