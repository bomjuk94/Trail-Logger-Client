const FALLBACK = 'https://api.bomjukim.com';
export const BASE = (process.env.EXPO_PUBLIC_API_BASE_URL || FALLBACK).replace(/\/$/, '');

export async function apiFetch(path: string, opts?: RequestInit) {
    const url = `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
    try {
        const res = await fetch(url, {
            ...opts,
            headers: {
                'Content-Type': 'application/json',
                ...(opts?.headers || {}),
            },
        });
        return res;
    } catch (e: any) {
        throw e;
    }
}
