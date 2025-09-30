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
