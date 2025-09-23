// app/lib/apiFetch.ts
export const BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

if (!BASE) {
    // optional: helpful during dev
    // throw new Error('EXPO_PUBLIC_API_BASE_URL is not set');
    console.warn('EXPO_PUBLIC_API_BASE_URL is not set');
}

export function apiFetch(path: string, opts?: RequestInit) {
    const url = `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
    return fetch(url, {
        ...opts,
        headers: {
            'Content-Type': 'application/json',
            ...(opts?.headers || {}),
        },
        // credentials: 'include', // only if you’re using cookies
    });
}



// import { Platform } from 'react-native';

// const API_BASE =
//     __DEV__
//         ? Platform.select({
//             ios: 'http://localhost:5000',
//             android: 'http://10.0.2.2:5000',
//             default: 'http://99.230.249.200:5000',
//             web: 'http://localhost:5000',
//         })!
//         : 'https://api.yourdomain.com';

// export const apiFetch = (path: string, opts?: RequestInit) =>
//     fetch(`${API_BASE}${path}`, {
//         headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
//         ...opts,
//     });
