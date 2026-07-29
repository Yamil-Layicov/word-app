import { useMutation } from "@tanstack/react-query";

import { requestEmailVerification } from "../api";

export function useRequestEmailVerification() {
  return useMutation({
    mutationFn: requestEmailVerification,
  });
}
