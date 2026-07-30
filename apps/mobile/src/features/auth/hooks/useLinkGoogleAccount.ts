import { useMutation } from "@tanstack/react-query";

import { queryClient } from "@/shared/lib/query-client";
import { linkGoogleAccount } from "../api";
import type { LinkedAuthIdentity } from "../model";
import { authQueryKeys } from "../query-keys";

export function useLinkGoogleAccount() {
  return useMutation({
    mutationFn: linkGoogleAccount,
    onSuccess: (linkedIdentity) => {
      queryClient.setQueryData<LinkedAuthIdentity[]>(
        authQueryKeys.identities(),
        (current) => upsertIdentity(current, linkedIdentity),
      );
    },
  });
}

function upsertIdentity(
  current: LinkedAuthIdentity[] | undefined,
  linkedIdentity: LinkedAuthIdentity,
): LinkedAuthIdentity[] {
  const identities = current ?? [];
  const existingIndex = identities.findIndex(
    (identity) => identity.provider === linkedIdentity.provider,
  );

  if (existingIndex === -1) {
    return [...identities, linkedIdentity];
  }

  return identities.map((identity, index) =>
    index === existingIndex ? linkedIdentity : identity,
  );
}
