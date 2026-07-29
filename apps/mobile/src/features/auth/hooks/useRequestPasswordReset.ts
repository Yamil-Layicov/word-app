import { useMutation } from "@tanstack/react-query";

import { requestPasswordReset } from "../api";

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: requestPasswordReset,
  });
}
