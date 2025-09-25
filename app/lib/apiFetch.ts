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
        console.log('[apiFetch] ERROR', url, e?.name, e?.message)
        throw e;
    }
}

// // lib/apiFetch.ts
// const FALLBACK = 'https://api.bomjukim.com';
// export const BASE = (process.env.EXPO_PUBLIC_API_BASE_URL || FALLBACK).replace(/\/$/, '');

// const join = (a: string, b: string) =>
//     `${a.replace(/\/+$/, '')}/${b.replace(/^\/+/, '')}`;

// export async function apiFetch(path: string, opts: RequestInit = {}) {
//     const url = join(BASE, path);
//     const res = await fetch(url, {
//         ...opts,
//         headers: {
//             'Content-Type': 'application/json',
//             ...(opts.headers || {}),
//         },
//     });

//     // Peek at response without breaking the stream
//     const ct = res.headers.get('content-type') || '';
//     const text = await res.text();

//     // TEMP: log first 120 chars to see what’s coming back
//     console.log('[apiFetch]', { url, status: res.status, ct, body: text.slice(0, 120) });

//     // Try to parse JSON only if server says it's JSON
//     let data: any = null;
//     if (ct.includes('application/json')) {
//         try { data = JSON.parse(text); } catch {/* ignore */ }
//     }

//     // Attach for consumers
//     (res as any)._text = text;
//     (res as any)._data = data;

//     return res;
// }
