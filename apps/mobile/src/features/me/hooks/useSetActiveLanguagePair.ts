import { useMutation } from "@tanstack/react-query";

import {
  setActiveLanguagePair,
  userQueryKeys,
  type SetActiveLanguagePairRequest,
} from "@/entities/user";
import { userLanguagePairQueryKeys } from "@/entities/user-language-pair";
import { queryClient } from "@/shared/lib/query-client";

export function useSetActiveLanguagePair() {
  return useMutation({
    mutationFn: (input: SetActiveLanguagePairRequest) => setActiveLanguagePair(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(userQueryKeys.profile(), profile);
      void queryClient.invalidateQueries({ queryKey: userLanguagePairQueryKeys.list() });
    },
  });
}
