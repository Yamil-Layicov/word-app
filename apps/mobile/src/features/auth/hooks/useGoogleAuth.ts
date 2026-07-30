import { useMutation } from "@tanstack/react-query";

import { authenticateWithGoogle } from "../api";

export function useGoogleAuth() {
  return useMutation({
    mutationFn: authenticateWithGoogle,
  });
}
