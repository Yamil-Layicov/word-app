import { useMutation } from "@tanstack/react-query";

import { updateMeProfile, userQueryKeys, type UpdateMeProfileRequest } from "@/entities/user";
import { queryClient } from "@/shared/lib/query-client";

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (input: UpdateMeProfileRequest) => updateMeProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(userQueryKeys.profile(), profile);
    },
  });
}
