import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch } from '@/app/lib/apiFetch';
import { useAuthToken } from '@/app/lib/userAuthToken';
import type { AuthStatus, User, Ctx, SignInProps } from '@/types';
import { getConfig } from '@/app/lib/getConfig';
import { showToast } from '@/app/lib/showToast';

const { getAuthKey } = getConfig()
const KEY = getAuthKey().authKey ?? 'traillogger_is_authed';

const AuthCtx = createContext<Ctx>(null as any);
const isWeb = Platform.OS === 'web';

// async function getBackend() {
//     try {
//         const ok = await SecureStore.isAvailableAsync();
//         if (ok) return 'secure' as const;
//     } catch { }
//     return 'async' as const;
// }

async function sget(key: string) {
    if (isWeb) return Promise.resolve(localStorage.getItem(key));
    try {
        const ok = await SecureStore.isAvailableAsync();
        if (ok) return SecureStore.getItemAsync(key);
    } catch { }
    return AsyncStorage.getItem(key);
}

// async function sget(key: string) {
//     const backend = await getBackend();
//     if (backend === 'secure') {
//         try {
//             const opts = Platform.OS === 'ios' ? { keychainService: 'com.traillogger.auth' } : undefined;
//             return await SecureStore.getItemAsync(key, opts as any);
//         } catch (e) {
//             console.warn('[auth] SecureStore.getItemAsync error:', e);
//             return null;
//         }
//     } else {
//         return AsyncStorage.getItem(key);
//     }
// }

async function sset(key: string, value: string) {
    if (isWeb) { localStorage.setItem(key, value); return; }
    try {
        const ok = await SecureStore.isAvailableAsync();
        if (ok) return SecureStore.setItemAsync(key, value);
    } catch { }
    return AsyncStorage.setItem(key, value);
}

// async function sset(key: string, value: string) {
//     const backend = await getBackend();
//     if (backend === 'secure') {
//         try {
//             const opts = Platform.OS === 'ios' ? { keychainService: 'com.traillogger.auth' } : undefined;
//             return await SecureStore.setItemAsync(key, value, opts as any);
//         } catch (e) {
//             console.warn('[auth] SecureStore.setItemAsync error, falling back:', e);
//             return AsyncStorage.setItem(key, value);
//         }
//     } else {
//         return AsyncStorage.setItem(key, value);
//     }
// }

async function sdel(key: string) {
    if (isWeb) { localStorage.removeItem(key); return; }
    try {
        const ok = await SecureStore.isAvailableAsync();
        if (ok) return SecureStore.deleteItemAsync(key);
    } catch { }
    return AsyncStorage.removeItem(key);
}

// async function sdel(key: string) {
//     const backend = await getBackend();
//     if (backend === 'secure') {
//         try {
//             const opts = Platform.OS === 'ios' ? { keychainService: 'com.traillogger.auth' } : undefined;
//             return await SecureStore.deleteItemAsync(key, opts as any);
//         } catch (e) {
//             console.warn('[auth] SecureStore.deleteItemAsync error, falling back:', e);
//             return AsyncStorage.removeItem(key);
//         }
//     } else {
//         return AsyncStorage.removeItem(key);
//     }
// }

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<AuthStatus>('loading');
    const [user, setUser] = useState<User>(null);
    const router = useRouter();
    const { saveToken, clearToken } = useAuthToken()

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const flag = await sget(KEY);
                if (cancelled) return;
                if (flag === '1') {
                    setUser({ id: 'local-user' });
                    setStatus('signedIn');
                } else {
                    setStatus('signedOut');
                }
            } catch (e) {
                if (!cancelled) {
                    console.warn('[auth] bootstrap error:', e);
                    setStatus('signedOut');
                }
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const signIn = async ({
        userName,
        password,
        setUserName,
        setPassword,
    }: SignInProps) => {
        try {
            const res = await apiFetch('/api/login', {
                method: 'POST',
                body: JSON.stringify({ userName, password }),
            });

            const returnedData = await res.json();
            if (!res.ok) {
                throw new Error(returnedData.error || 'Login failed');
            }

            if (returnedData.token) {
                await sset(KEY, '1');                 // persist “authed” flag
                await saveToken(returnedData.token);  // token → localStorage on web / SecureStore on native
                setUser({ id: 'remote-user' });
                setStatus('signedIn');
                router.replace('/');
            }
        } catch (e) {
            showToast({ type: 'error', msg: (e as Error).message });
            console.warn('[auth] signIn failed:', (e as Error).message);
            setUser(null);
            setStatus('signedOut');
        }

        setUserName('')
        setPassword('')
    };

    const register = async (userName: string, password: string) => {
        try {
            const res = await apiFetch('/api/register', {
                method: 'POST',
                body: JSON.stringify({ userName, password }),
            })

            const returnedData = await res.json();
            if (!res.ok) throw new Error(returnedData.error || 'Registration failed');

            if (returnedData.token) {
                await sset(KEY, '1');
                await saveToken(returnedData.token);
                setUser({ id: 'remote-user' });
                setStatus('signedIn');
                router.replace('/');

                // saveToken(returnedData.token)
                // setUser({ id: 'remote-user' });
                // setStatus('signedIn');
                // router.replace('/');
            }
        } catch (e) {
            console.warn('[auth] register failed:', (e as Error).message);
            setUser(null);
            setStatus('signedOut');
        }
    };

    const signOut = async () => {
        try {
            await sdel(KEY);
            await clearToken();
        } finally {
            setUser(null);
            setStatus('signedOut');
        }
    };

    const value = useMemo(
        () => ({ status, user, signIn, register, signOut }),
        [status, user]
    );

    return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
