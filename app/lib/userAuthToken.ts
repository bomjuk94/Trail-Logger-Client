// app/lib/userAuthToken.ts
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getConfig } from './getConfig';

const { getTokenKey } = getConfig();
const TOKEN_KEY = getTokenKey().tokenKey;

export function useAuthToken() {
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (Platform.OS === 'web') {
                    const t = localStorage.getItem(TOKEN_KEY);
                    if (!cancelled) setToken(t);
                } else {
                    const t = await SecureStore.getItemAsync(TOKEN_KEY);
                    if (!cancelled) setToken(t);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const saveToken = async (t: string) => {
        if (Platform.OS === 'web') {
            localStorage.setItem(TOKEN_KEY, t);
        } else {
            await SecureStore.setItemAsync(TOKEN_KEY, t);
        }
        setToken(t);
    };

    const clearToken = async () => {
        if (Platform.OS === 'web') {
            localStorage.removeItem(TOKEN_KEY);
        } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
        setToken(null);
    };

    return { token, loading, saveToken, clearToken };
}
