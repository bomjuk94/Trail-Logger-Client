// lib/getConfig.ts
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import type { Extra } from '@/types/Constants';

function resolveExtra(): Extra {
    const fromExpoConfig = (Constants?.expoConfig?.extra ?? {}) as Extra;
    const fromUpdates = ((Updates as any)?.manifest?.extra ?? {}) as Extra;

    return { ...fromExpoConfig, ...fromUpdates };
}

const extra = resolveExtra();

export const getConfig = () => {
    function ensure<K extends keyof Extra>(key: K, err: string): NonNullable<Extra[K]> {
        const val = extra?.[key];
        if (val == null || val === '') throw new Error(err);
        return val as NonNullable<Extra[K]>;
    }

    function getWeather() {
        const openWeatherApiKey = ensure(
            'openWeatherApiKey',
            'Expo extra config is missing (no OpenWeather API key found).'
        );
        return { openWeatherApiKey };
    }

    function getAskedKey() {
        const askedKey = ensure(
            'askedKey',
            'Expo extra config is missing (no asked key found).'
        );
        return { askedKey };
    }

    function getBkgdKey() {
        const bkgdKey = ensure(
            'bkgdKey',
            'Expo extra config is missing (no background key found).'
        );
        return { bkgdKey };
    }

    function getTokenKey() {
        const tokenKey = ensure(
            'tokenKey',
            'Expo extra config is missing (no token key found).'
        );
        return { tokenKey };
    }

    function getAuthKey() {
        const authKey = ensure(
            'authKey',
            'Expo extra config is missing (no auth key found).'
        );
        return { authKey };
    }


    return { getWeather, getAskedKey, getBkgdKey, getTokenKey, getAuthKey };
};




// import type { Extra } from "@/types/Constants";
// import Constants from 'expo-constants';
// import * as Updates from 'expo-updates';

// export const getConfig = () => {

//     function getWeather(): Extra {
//         const fromConfig =
//             (Constants.expoConfig?.extra as Extra | undefined) ||
//             ((Updates.manifest as any)?.extra as Extra | undefined);

//         const openWeatherFromEnv = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY as string | undefined;

//         if (fromConfig?.openWeatherApiKey) return fromConfig;
//         if (openWeatherFromEnv) {
//             return { ...fromConfig, openWeatherApiKey: openWeatherFromEnv } as Extra;
//         }
//         throw new Error('Expo extra config is missing (no OpenWeather API key found).');
//     }

//     function getAskedKey() {
//         const fromConfig =
//             (Constants.expoConfig?.extra as Extra | undefined) ||
//             ((Updates.manifest as any)?.extra as Extra | undefined);

//         const askedKeyFromEnv = process.env.EXPO_PUBLIC_ASKED_KEY as string | undefined;

//         if (fromConfig?.askedKey) return fromConfig;
//         if (askedKeyFromEnv) {
//             return { ...fromConfig, askedKey: askedKeyFromEnv } as Extra;
//         }
//         throw new Error('Expo extra config is missing (no asked key found).');
//     }

//     function getBkgdKey() {
//         const fromConfig =
//             (Constants.expoConfig?.extra as Extra | undefined) ||
//             ((Updates.manifest as any)?.extra as Extra | undefined);

//         const bkgdKeyFromEnv = process.env.EXPO_PUBLIC_BKGD_KEY as string | undefined;

//         if (fromConfig?.bkgdKey) return fromConfig;
//         if (bkgdKeyFromEnv) {
//             return { ...fromConfig, bkgdKey: bkgdKeyFromEnv } as Extra;
//         }
//         throw new Error('Expo extra config is missing (no background key found).');
//     }

//     function getTokenKey() {
//         const fromConfig =
//             (Constants.expoConfig?.extra as Extra | undefined) ||
//             ((Updates.manifest as any)?.extra as Extra | undefined);

//         const tokenKeyFromEnv = process.env.EXPO_PUBLIC_TOKEN_KEY as string | undefined;

//         if (fromConfig?.tokenKey) return fromConfig;
//         if (tokenKeyFromEnv) {
//             return { ...fromConfig, tokenKey: tokenKeyFromEnv } as Extra;
//         }
//         throw new Error('Expo extra config is missing (no background key found).');
//     }

//     return {
//         getWeather,
//         getAskedKey,
//         getBkgdKey,
//         getTokenKey,
//     }
// }