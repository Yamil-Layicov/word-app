import { Redirect } from "expo-router";

import { useAuthSession } from "@/features/auth";

export default function IndexRoute() {
  const { status } = useAuthSession();

  if (status === "authenticated") {
    return <Redirect href="/(app)" />;
  }

  if (status === "onboarding-required") {
    return <Redirect href="/language-pair" />;
  }

  return <Redirect href="/login" />;
}
