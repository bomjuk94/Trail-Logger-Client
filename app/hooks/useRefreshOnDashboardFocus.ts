import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";
import { listHikes } from "../lib/db";
import { fetchTrailsFromApi } from "../lib/fetchTrails";
import type { UseRefreshOnDashboardFocusProps } from "@/types";

export const useRefreshOnDashboardFocus = ({
  userId,
  token,
  setHikes,
}: UseRefreshOnDashboardFocusProps & { token: string | null }) => {
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;

      (async () => {
        try {
          const net = await NetInfo.fetch();

          if (!net.isConnected) {
            const rows = await listHikes(userId);
            if (!cancelled) setHikes(rows);
          } else {
            const data = await fetchTrailsFromApi(token);
            if (!cancelled) setHikes(data);
          }
        } catch (e) {
          console.warn("Failed to load hikes:", e);
          if (!cancelled) setHikes([]);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [userId, token])
  );
};
