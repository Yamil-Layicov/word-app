import { useAuthSession } from "../AuthSessionProvider";

export function useStartSession() {
  return useAuthSession().startSession;
}
