import { useEffect } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import type { PositionProps } from "@/types/Location";

export const useGetLivePosition = ({ permStatus, setLocation }: PositionProps) => {
    useEffect(() => {
        if (permStatus !== "granted") return;

        let cancelled = false;
        let nativeSub: Location.LocationSubscription | null = null;
        let webWatchId: number | null = null;

        (async () => {
            try {
                if (Platform.OS === "web") {
                    if (!("geolocation" in navigator)) {
                        console.warn("Browser geolocation not available");
                        return;
                    }
                    webWatchId = navigator.geolocation.watchPosition(
                        (pos) => {
                            if (cancelled) return;
                            setLocation({
                                coords: {
                                    latitude: pos.coords.latitude,
                                    longitude: pos.coords.longitude,
                                    altitude: pos.coords.altitude ?? null as any,
                                    accuracy: pos.coords.accuracy,
                                    altitudeAccuracy: pos.coords.altitudeAccuracy ?? undefined,
                                    heading: pos.coords.heading ?? null,
                                    speed: pos.coords.speed ?? null,
                                },
                                timestamp: pos.timestamp,
                            } as any);
                        },
                        (err) => {
                            console.warn("web watchPosition error:", err);
                        },
                        { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
                    );
                } else {
                    nativeSub = await Location.watchPositionAsync(
                        { accuracy: Location.Accuracy.Balanced, distanceInterval: 50 },
                        (pos) => {
                            if (!cancelled) setLocation(pos);
                        }
                    );
                }
            } catch (e) {
                console.warn("watchPosition failed:", e);
            }
        })();

        return () => {
            cancelled = true;
            try {
                nativeSub?.remove?.();
            } catch { }
            if (webWatchId != null && "geolocation" in navigator) {
                navigator.geolocation.clearWatch(webWatchId);
            }
        };
    }, [permStatus, setLocation]);
};
