import { useEffect } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import type { PositionProps } from "@/types/Location";

export const useGetCachedPosition = ({ permStatus, setLocation }: PositionProps) => {
    useEffect(() => {
        if (permStatus !== "granted") return;

        let mounted = true;

        (async () => {
            try {
                if (Platform.OS === "web") {
                    if (!("geolocation" in navigator)) return;
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            if (!mounted) return;
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
                        (err) => console.warn("web getCurrentPosition error:", err),
                        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
                    );
                    return;
                }

                const cached = await Location.getLastKnownPositionAsync();
                if (mounted && cached) setLocation(cached);

                const fresh = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                    timeout: 15000,
                });
                if (mounted) setLocation(fresh);
            } catch (e) {
                console.warn("getCurrentPosition failed:", e);
            }
        })();

        return () => { mounted = false; };
    }, [permStatus]);
};
