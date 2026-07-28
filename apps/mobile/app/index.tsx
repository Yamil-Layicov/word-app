import { Redirect } from "expo-router";

import { useAuthSession } from "@/features/auth";

export default function IndexRoute() {
  const { status } = useAuthSession();

  return <Redirect href={status === "authenticated" ? "/(app)" : "/login"} />;
}
