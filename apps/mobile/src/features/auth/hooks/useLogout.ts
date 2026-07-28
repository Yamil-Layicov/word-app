import { useAuthSession } from "../AuthSessionProvider";

export function useLogout() {
  return useAuthSession().endSession;
}
