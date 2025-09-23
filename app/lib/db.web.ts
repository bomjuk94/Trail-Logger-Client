import { apiFetch } from '@/app/lib/apiFetch';
import type { HikeRow } from '@/types';
import { getConfig } from '@/app/lib/getConfig';

const { getTokenKey } = getConfig();
const TOKEN_KEY = getTokenKey().tokenKey;

export async function ensureDb() { }

export async function saveHike(hike: HikeRow, token: string | null) {
    const res = await apiFetch(`/api/trails/${encodeURIComponent(hike.trailId)}`, {
        method: 'PUT',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(hike),
    });
    if (!res.ok) throw new Error(await safeErr(res));
    return res.json();
}

// Keep signature: (userId) so your hook keeps working.
// We ignore userId on web and use the token from storage.
export async function listHikes(_userId: string | null): Promise<HikeRow[]> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

    const res = await apiFetch('/api/trails', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

    if (res.status === 402 || res.status === 404) return [];
    if (!res.ok) throw new Error(await safeErr(res));

    const data = await res.json();
    return Array.isArray(data) ? data : (data ?? []);
}

export function parsePoints<T = any>(row: HikeRow): T[] {
    try { return row.points_json ? (JSON.parse(row.points_json) as T[]) : []; }
    catch { return []; }
}

async function safeErr(res: Response) {
    try { const j = await res.json(); return j?.error || j?.message || res.statusText; }
    catch { return res.statusText; }
}
