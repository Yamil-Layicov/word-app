import { useMutation } from "@tanstack/react-query";

import {
  addMeLanguagePair,
  userLanguagePairQueryKeys,
  type AddMeLanguagePairRequest,
} from "@/entities/user-language-pair";
import { userQueryKeys } from "@/entities/user";
import { queryClient } from "@/shared/lib/query-client";

export function useAddLanguagePair() {
  return useMutation({
    mutationFn: (input: AddMeLanguagePairRequest) => addMeLanguagePair(input),
    onSuccess: (languagePairs) => {
      queryClient.setQueryData(userLanguagePairQueryKeys.list(), languagePairs);
      void queryClient.invalidateQueries({ queryKey: userQueryKeys.profile() });
    },
  });
}
