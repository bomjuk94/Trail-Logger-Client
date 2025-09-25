// apiFetch.ts
// const FALLBACK = 'https://senior-stacey-zealouslurker-33de224b.koyeb.app';
const FALLBACK = 'api.bomjukim.com';
export const BASE = (process.env.EXPO_PUBLIC_API_BASE_URL || FALLBACK).replace(/\/$/, '');

console.log('[BOOT] BASE =', BASE);

export async function apiFetch(path: string, opts?: RequestInit) {
    const url = `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
    console.log('[apiFetch] ->', url, opts?.method || 'GET');
    try {
        const res = await fetch(url, {
            ...opts,
            headers: {
                'Content-Type': 'application/json',
                ...(opts?.headers || {}),
            },
        });
        console.log('[apiFetch] <-', res.status, url);
        return res;
    } catch (e: any) {
        console.log('[apiFetch] ERROR', url, e?.name, e?.message)
        throw e;
    }
}