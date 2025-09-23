import { useEffect } from "react";
import { haveresine } from "../lib/haveresine";
import { getConfig } from "../lib/getConfig";
import { showToast } from "../lib/showToast";
import type { UseGetWeatherProps } from "@/types";

export const useGetWeather = ({
    permStatus,
    location,
    lastFetchRef,
    setErrorMsg,
    setWeather,
}: UseGetWeatherProps) => {

    const { haversineMeters } = haveresine()
    const { getWeather } = getConfig()

    useEffect(() => {
        if (permStatus !== 'granted' || !location) return;

        const { latitude, longitude } = location.coords;

        const now = Date.now();
        const last = lastFetchRef.current;
        const movedFar = last ? haversineMeters(last.lat, last.lon, latitude, longitude) > 250 : true;
        const timeOk = !last || now - last.t > 5 * 60 * 1000;

        if (!movedFar && !timeOk) return;

        let cancelled = false;

        (async () => {
            try {
                let apiKey: string | undefined;
                try {
                    apiKey = getWeather().openWeatherApiKey;
                } catch {
                    setErrorMsg('Missing OpenWeather API key.');
                    return;
                }
                if (!apiKey) {
                    setErrorMsg('Missing OpenWeather API key.');
                    return;
                }

                const res = await fetch(
                    `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`
                );
                if (!res.ok) {
                    showToast({ type: 'error', msg: 'Could not fetch weather data' });
                    return;
                }

                const data = await res.json();
                if (cancelled) return;

                setWeather({
                    name: data.name,
                    icon: data.weather?.[0]?.icon,
                    temperatureCurr: data.main?.temp,
                    temperatureFeels: data.main?.feels_like,
                    temperatureHigh: data.main?.temp_max,
                    temperatureLow: data.main?.temp_min,
                    humidity: data.main?.humidity,
                    visibility: data.visibility,
                    speedW: data.wind?.speed,
                    clouds: data.clouds?.all,
                });

                lastFetchRef.current = { t: now, lat: latitude, lon: longitude };
                setErrorMsg(null);
            } catch (e) {
                console.warn('Failed to load weather:', e);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [permStatus, location]);
}