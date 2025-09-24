// app/lib/apiFetch.ts
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

function getApiBase(): string {
    // Read from expo config at build/runtime (covers native + web)
    const extra =
        (Constants?.expoConfig?.extra as any) ??
        ((Updates as any)?.manifest?.extra as any) ??
        {};

    const raw =
        extra.apiBase ??
        process.env.EXPO_PUBLIC_API_BASE_URL ?? // web/dev fallback
        '';

    return String(raw).replace(/\/$/, ''); // strip trailing slash
}

export const BASE = getApiBase();

if (!BASE) {
    console.warn('EXPO_PUBLIC_API_BASE_URL / extra.apiBase is not set — requests will be relative and fail.');
}

export function apiFetch(path: string, opts?: RequestInit) {
    const url = `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
    return fetch(url, {
        ...opts,
        headers: {
            'Content-Type': 'application/json',
            ...(opts?.headers || {}),
        },
    });
}
