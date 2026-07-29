import { useMutation } from "@tanstack/react-query";

import { confirmEmailVerification } from "../api";

export function useConfirmEmailVerification() {
  return useMutation({
    mutationFn: confirmEmailVerification,
  });
}
