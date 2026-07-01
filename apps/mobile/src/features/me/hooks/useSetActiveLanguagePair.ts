import { useMutation } from "@tanstack/react-query";

import {
  setActiveLanguagePair,
  userQueryKeys,
  type SetActiveLanguagePairRequest,
} from "@/entities/user";
import {
  userLanguagePairQueryKeys,
  type UserLanguagePair,
} from "@/entities/user-language-pair";
import { queryClient } from "@/shared/lib/query-client";

export function useSetActiveLanguagePair() {
  return useMutation({
    mutationFn: (input: SetActiveLanguagePairRequest) => setActiveLanguagePair(input),
    onSuccess: (profile, input) => {
      queryClient.setQueryData(userQueryKeys.profile(), profile);
      queryClient.setQueryData<UserLanguagePair[]>(
        userLanguagePairQueryKeys.list(),
        (current) =>
          current?.map((languagePair) => ({
            ...languagePair,
            isActive: languagePair.languagePairId === input.languagePairId,
          })),
      );
      void queryClient.invalidateQueries({ queryKey: userLanguagePairQueryKeys.list() });
    },
  });
}
