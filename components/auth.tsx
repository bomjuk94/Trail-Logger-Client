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

const { getAuthKey } = getConfig();
const KEY = getAuthKey().authKey ?? 'traillogger_is_authed';

const AuthCtx = createContext<Ctx>(null as any);
const isWeb = Platform.OS === 'web';

/** Storage helpers (web → localStorage; native → SecureStore with AsyncStorage fallback) */
async function sget(key: string) {
    if (isWeb) return Promise.resolve(localStorage.getItem(key));
    try {
        const ok = await SecureStore.isAvailableAsync();
        if (ok) return SecureStore.getItemAsync(key);
    } catch { }
    return AsyncStorage.getItem(key);
}
async function sset(key: string, value: string) {
    if (isWeb) { localStorage.setItem(key, value); return; }
    try {
        const ok = await SecureStore.isAvailableAsync();
        if (ok) return SecureStore.setItemAsync(key, value);
    } catch { }
    return AsyncStorage.setItem(key, value);
}
async function sdel(key: string) {
    if (isWeb) { localStorage.removeItem(key); return; }
    try {
        const ok = await SecureStore.isAvailableAsync();
        if (ok) return SecureStore.deleteItemAsync(key);
    } catch { }
    return AsyncStorage.removeItem(key);
}

/** Parse a fetch Response safely:
 * - Prefer JSON when content-type says JSON
 * - Otherwise fall back to text
 * Returns: { ok, status, data, text }
 */
async function safeParse(res: Response) {
    const ct = res.headers.get('content-type') || '';
    let text = '';
    try {
        text = await res.text();
    } catch {
        text = '';
    }

    let data: any = null;
    if (ct.includes('application/json')) {
        try { data = JSON.parse(text); } catch { /* keep null */ }
    } else {
        // Sometimes servers send JSON without proper header — try best-effort parse
        try { data = JSON.parse(text); } catch { /* keep null */ }
    }

    return { ok: res.ok, status: res.status, data, text };
}

/** Prefer server-provided message; otherwise fall back to text or a generic label */
function pickErrorMessage(payload: { data: any, text: string }, fallback: string) {
    const { data, text } = payload;
    return (
        data?.error ||
        data?.message ||
        (typeof data === 'string' ? data : '') ||
        text ||
        fallback
    );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<AuthStatus>('loading');
    const [user, setUser] = useState<User>(null);
    const router = useRouter();
    const { saveToken, clearToken } = useAuthToken();

    /** Bootstrap session */
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

    /** Sign in */


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
            console.log('returned data', returnedData)
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

    // const signIn = async ({
    //     userName,
    //     password,
    //     setUserName,
    //     setPassword,
    // }: SignInProps) => {
    //     try {
    //         const res = await apiFetch('/api/login', {
    //             method: 'POST',
    //             body: JSON.stringify({ userName, password }),
    //         });

    //         const data = await res.json()
    //         console.log('data', data)

    //         // const parsed = await safeParse(res);
    //         // console.log('parsed response', res.)

    //         // if (!parsed.ok) {
    //         //     const msg = pickErrorMessage(parsed, 'Login failed');
    //         //     throw new Error(msg);
    //         // }
    //         // const token = parsed.data?.token;
    //         // if (!token) {
    //         //     throw new Error('Malformed response from server (missing token).');
    //         // }

    //         // await sset(KEY, '1');
    //         // await saveToken(token);
    //         // setUser({ id: 'remote-user' });
    //         // setStatus('signedIn');
    //         // router.replace('/');
    //     } catch (e) {
    //         const msg = (e as Error).message || 'Login failed';
    //         showToast({ type: 'error', msg });
    //         console.warn('[auth] signIn failed:', msg);
    //         setUser(null);
    //         setStatus('signedOut');
    //     } finally {
    //         // Clear input fields regardless
    //         setUserName('');
    //         setPassword('');
    //     }
    // };

    /** Register */
    const register = async (userName: string, password: string) => {
        try {
            const res = await apiFetch('/api/register', {
                method: 'POST',
                body: JSON.stringify({ userName, password }),
            });

            const parsed = await safeParse(res);

            if (!parsed.ok) {
                const msg = pickErrorMessage(parsed, 'Registration failed');
                throw new Error(msg);
            }

            const token = parsed.data?.token;
            if (!token) {
                throw new Error('Malformed response from server (missing token).');
            }

            await sset(KEY, '1');
            await saveToken(token);
            setUser({ id: 'remote-user' });
            setStatus('signedIn');
            router.replace('/');
        } catch (e) {
            const msg = (e as Error).message || 'Registration failed';
            showToast({ type: 'error', msg });
            console.warn('[auth] register failed:', msg);
            setUser(null);
            setStatus('signedOut');
        }
    };

    /** Sign out */
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
