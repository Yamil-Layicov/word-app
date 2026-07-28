import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";

import { getAccessToken } from "@/auth";
import { getNotificationDestination } from "./notification-destination";
import { savePendingNotificationDestination } from "./pending-notification-destination";

export function NotificationNavigationObserver() {
  const router = useRouter();
  const handledResponseIds = useRef(new Set<string>());

  const handleResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      if (
        response.actionIdentifier !==
        Notifications.DEFAULT_ACTION_IDENTIFIER
      ) {
        return;
      }

      const destination = getNotificationDestination(
        response.notification.request.content.data,
      );

      if (!destination) {
        return;
      }

      const responseId = response.notification.request.identifier;

      if (handledResponseIds.current.has(responseId)) {
        return;
      }

      handledResponseIds.current.add(responseId);
      Notifications.clearLastNotificationResponse();

      if (!getAccessToken()) {
        savePendingNotificationDestination(destination);
        router.replace("/login");
        return;
      }

      router.push(destination);
    },
    [router],
  );

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const lastResponse = Notifications.getLastNotificationResponse();

    if (lastResponse) {
      handleResponse(lastResponse);
    }

    const subscription =
      Notifications.addNotificationResponseReceivedListener(handleResponse);

    return () => {
      subscription.remove();
    };
  }, [handleResponse]);

  return null;
}
