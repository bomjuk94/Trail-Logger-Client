import 'dotenv/config';
import type { ExpoConfig } from '@expo/config';

const config: ExpoConfig = {
    name: "trail-logger",
    slug: "trail-logger",
    version: "1.0.0",
    icon: "./assets/images/icon.png",
    splash: {
        image: "./assets/images/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#548C46",
    },
    web: {
        bundler: "metro",
        favicon: "./assets/images/favicon.png",
        meta: {
            themeColor: "#548C46",
            apple: true,
            description: "Log hikes with GPS and weather.",
            viewport:
                "width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no",
        },
        backgroundColor: "#ffffff",
        display: "standalone",
        output: "static",
    },
    extra: {
        // Public (okay to expose in client bundle)
        // apiBase: process.env.EXPO_PUBLIC_API_BASE_URL,
        openWeatherApiKey: process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY,
        // Private (native only; keep if you also build Android later)
        askedKey: process.env.ASKED_KEY,
        bkgdKey: process.env.BKGD_KEY,
        tokenKey: process.env.TOKEN_KEY,
        authKey: process.env.AUTH_KEY,
        // openWeatherApiKey: process.env.OPENWEATHER_API_KEY,
        // askedKey: process.env.ASKED_KEY,
        // bkgdKey: process.env.BKGD_KEY,
        // tokenKey: process.env.TOKEN_KEY,
        // authKey: process.env.AUTH_KEY,
    },
    android: {
        permissions: [
            "ACCESS_COARSE_LOCATION",
            "ACCESS_FINE_LOCATION",
            "ACCESS_BACKGROUND_LOCATION",
            "FOREGROUND_SERVICE",
        ],
    },
    plugins: [
        [
            "expo-location",
            {
                locationWhenInUsePermission:
                    "Allow Trail Logger to access your location while using the app.",
                locationAlwaysAndWhenInUsePermission:
                    "Allow Trail Logger to access your location while you’re hiking, even when the app is not in use.",
                foregroundService: {
                    notificationTitle: "Trail Logger",
                    notificationBody: "Recording your hike…",
                },
            },
        ],
    ],
    scheme: "traillogger",
};

export default config;
