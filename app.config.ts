import 'dotenv/config';
import type { ExpoConfig } from '@expo/config';

const config: ExpoConfig = {
    name: "trail-logger",
    slug: "trail-logger",
    version: "1.0.0",
    icon: "./public/images/icon.png",
    splash: {
        image: "./public/images/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#548C46",
    },
    web: {
        bundler: "metro",
        favicon: "./public/images/favicon.png",
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
        apiBase: process.env.EXPO_PUBLIC_API_BASE_URL,
        openWeatherApiKey: process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY,
        tokenKey: process.env.EXPO_PUBLIC_TOKEN_KEY ?? "tl_jwt",
        authKey: process.env.EXPO_PUBLIC_AUTH_KEY ?? "traillogger_is_authed",
        askedKey: process.env.EXPO_PUBLIC_ASKED_KEY ?? "hasPromptedLocation",
        bkgdKey: process.env.EXPO_PUBLIC_BKGD_KEY ?? "@trail-logger:points-buffer",
    },
    android: {
        package: "app.traillogger",
        versionCode: 1,
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
