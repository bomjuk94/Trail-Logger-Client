import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import * as SQLite from 'expo-sqlite';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { saveHike } from '../lib/db';
import { useAuthToken } from '../lib/userAuthToken';
import { decodeUserId } from '../lib/useCurrentUser';
import { showToast } from '../lib/showToast';
import type { RecorderStatus, TrackPoint, StopResult, StopSummary } from '@/types';

// ---------- Optional native storage for snapshots ----------
let AsyncStorage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, v: string): Promise<void>;
    removeItem(key: string): Promise<void>;
} | null = null;

if (Platform.OS !== 'web') {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        AsyncStorage = require('@react-native-async-storage/async-storage').default;
    } catch {
        AsyncStorage = null;
    }
}

const R = 6371000; // meters
const SNAPSHOT_KEY = 'trailRecorder.snapshot.v1';

// ------------------------- distance helper -------------------------
function haversine(a: TrackPoint, b: TrackPoint) {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const A =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(A));
}

// ------------------------- snapshot storage -------------------------
async function snapSet(value: unknown) {
    const s = JSON.stringify(value);
    if (Platform.OS === 'web') {
        try {
            localStorage.setItem(SNAPSHOT_KEY, s);
        } catch { }
    } else if (AsyncStorage) {
        try {
            await AsyncStorage.setItem(SNAPSHOT_KEY, s);
        } catch { }
    }
}

async function snapGet<T>() {
    try {
        if (Platform.OS === 'web') {
            const raw = localStorage.getItem(SNAPSHOT_KEY);
            return raw ? (JSON.parse(raw) as T) : null;
        } else if (AsyncStorage) {
            const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
            return raw ? (JSON.parse(raw) as T) : null;
        }
    } catch { }
    return null;
}

async function snapClear() {
    try {
        if (Platform.OS === 'web') {
            localStorage.removeItem(SNAPSHOT_KEY);
        } else if (AsyncStorage) {
            await AsyncStorage.removeItem(SNAPSHOT_KEY);
        }
    } catch { }
}

// ------------------------- tiny SQLite queue -------------------------
type PendingRow = {
    trailId: string;
    started_at: number;
    ended_at: number;
    distance_m: number;
    duration_s: number;
    points_json: string;
    created_at: number;
    sync_status: 'pending' | 'synced';
    last_error?: string | null;
};

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase | null {
    if (Platform.OS === 'web') return null; // skip web for now
    if (!db) {
        // SDK 51+: use the sync API
        db = SQLite.openDatabaseSync('trails.db');
    }
    return db;
}

function initLocalDb() {
    const d = getDb();
    if (!d) return;
    d.execSync(
        `CREATE TABLE IF NOT EXISTS pending_hikes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trailId TEXT UNIQUE,
      started_at INTEGER,
      ended_at INTEGER,
      distance_m INTEGER,
      duration_s INTEGER,
      points_json TEXT,
      created_at INTEGER,
      sync_status TEXT,
      last_error TEXT
    );`
    );
}

function insertPending(summary: StopSummary): Promise<void> {
    const d = getDb();
    const created_at = Date.now();

    if (!d) {
        // Web fallback: localStorage
        try {
            const key = `pending_hikes_${summary.trailId}`;
            const payload = {
                trailId: summary.trailId,
                started_at: summary.startedAt,
                ended_at: summary.endedAt,
                distance_m: summary.distance_m,
                duration_s: summary.duration_s,
                points_json: JSON.stringify(summary.points),
                created_at,
                sync_status: 'pending',
                last_error: null,
            };
            localStorage.setItem(key, JSON.stringify(payload));
        } catch { }
        return Promise.resolve();
    }

    try {
        d.runSync(
            `INSERT OR REPLACE INTO pending_hikes 
        (trailId, started_at, ended_at, distance_m, duration_s, points_json, created_at, sync_status, last_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                summary.trailId,
                summary.startedAt,
                summary.endedAt,
                summary.distance_m,
                summary.duration_s,
                JSON.stringify(summary.points),
                created_at,
                'pending',
                null,
            ]
        );
        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

// ------------------------- hook -------------------------
export default function useTrailRecorder() {
    const [status, setStatus] = useState<RecorderStatus>('idle');
    const [elapsed, setElapsed] = useState(0);
    const [distance, setDistance] = useState(0);
    const [points, setPoints] = useState<TrackPoint[]>(() => []);

    // Watchers per platform
    const nativeSubRef = useRef<Location.LocationSubscription | null>(null);
    const webWatchIdRef = useRef<number | null>(null);

    const tickRef = useRef<number | null>(null);
    const startTsRef = useRef<number>(0);
    const lastRef = useRef<TrackPoint | null>(null);

    // init local DB once
    useEffect(() => {
        initLocalDb();
    }, []);

    // Keep-awake on native only (web uses Wake Lock elsewhere)
    useEffect(() => {
        let active = false;
        (async () => {
            if (status === 'recording' && Platform.OS !== 'web') {
                await activateKeepAwakeAsync('trail-recorder');
                active = true;
            }
        })();
        return () => {
            if (active && Platform.OS !== 'web') {
                deactivateKeepAwake('trail-recorder');
            }
        };
    }, [status]);

    // Filters (prod)
    const MIN_ACCURACY_M = 30;  // discard noisy fixes (>30 m)
    const MAX_SPEED_MS = 12;    // discard unrealistic jumps (>12 m/s)
    const MAX_JUMP_M = 120;     // discard single huge hops

    const handlePoint = useCallback((p: TrackPoint & { acc?: number }) => {
        const last = lastRef.current;

        if (typeof p.acc === 'number' && p.acc > MIN_ACCURACY_M) {
            return;
        }

        if (last) {
            const d = haversine(last, p);
            const dt = Math.max(1, (p.ts - last.ts) / 1000);
            const v = d / dt;
            if (d > MAX_JUMP_M || v > MAX_SPEED_MS) return;
            setDistance(x => x + d);
        }

        lastRef.current = p;
        setPoints(prev => (Array.isArray(prev) ? prev.concat(p) : [p]));
    }, []);

    function startTimer() {
        tickRef.current = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTsRef.current) / 1000));
        }, 1000) as unknown as number;
    }

    function stopTimer() {
        if (tickRef.current) {
            clearInterval(tickRef.current);
            tickRef.current = null;
        }
    }

    function clearWatchers() {
        try {
            nativeSubRef.current?.remove?.();
        } catch { }
        nativeSubRef.current = null;

        try {
            if (webWatchIdRef.current != null && typeof navigator !== 'undefined') {
                navigator.geolocation?.clearWatch?.(webWatchIdRef.current);
            }
        } catch { }
        webWatchIdRef.current = null;
    }

    const start = useCallback(async () => {
        if (Platform.OS !== 'web') {
            const { status: perm } = await Location.requestForegroundPermissionsAsync();
            if (perm !== 'granted') throw new Error('Location permission denied');
        }

        startTsRef.current = Date.now();
        setElapsed(0);
        setDistance(0);
        setPoints([]);
        lastRef.current = null;

        startTimer();

        if (Platform.OS === 'web') {
            if (!('geolocation' in navigator)) throw new Error('Geolocation not supported in this browser');
            webWatchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    handlePoint({
                        ts: Date.now(),
                        lat: pos.coords.latitude,
                        lon: pos.coords.longitude,
                        alt: (pos.coords.altitude as number | null) ?? null,
                    });
                },
                (err) => console.warn('web watchPosition error:', err),
                { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
            );
        } else {
            nativeSubRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Highest,
                    distanceInterval: 1,
                    timeInterval: 2000,
                    mayShowUserSettingsDialog: true,
                },
                (loc) => {
                    handlePoint({
                        ts: Date.now(),
                        lat: loc.coords.latitude,
                        lon: loc.coords.longitude,
                        alt: loc.coords.altitude ?? null,
                        acc: loc.coords.accuracy ?? undefined,
                    });
                }
            );
        }

        setStatus('recording');
    }, [handlePoint]);

    // ---------- Auth / User ----------
    const { token } = useAuthToken();
    const user_id = useMemo(() => decodeUserId(token), [token]);
    const userIdRef = useRef<string | null>(null);
    useEffect(() => {
        userIdRef.current = user_id;
    }, [user_id]);

    // ---------- Stop with online/offline routing ----------
    const stop = useCallback(async (): Promise<StopResult> => {
        clearWatchers();
        stopTimer();

        const summary: StopSummary = {
            trailId: (globalThis as any).crypto?.randomUUID?.() ?? String(Date.now()),
            startedAt: startTsRef.current,
            endedAt: Date.now(),
            distance_m: Math.round(distance),
            duration_s: elapsed,
            points,
        };

        const uid = userIdRef.current;
        if (!uid) {
            setStatus('idle');
            // persist locally so user can sync after login
            try { await insertPending(summary); } catch { }
            // clear snapshot anyway—we’ve serialized the hike
            void snapClear();
            return { summary, saved: false, error: new Error('Not logged in') };
        }

        // Network state
        const net = await NetInfo.fetch();
        const canTryRemote = !!token && !!net.isConnected && !net.isInternetReachable === false
            ? true
            : !!token && !!net.isConnected && net.details != null; // fallback heuristic

        try {
            if (canTryRemote) {
                const hike = {
                    trailId: summary.trailId,
                    started_at: summary.startedAt,
                    ended_at: summary.endedAt,
                    distance_m: summary.distance_m,
                    duration_s: summary.duration_s,
                    points_json: JSON.stringify(summary.points),
                };
                await saveHike(hike, token);
                setStatus('idle');
                void snapClear();
                return { summary, saved: true };
            }

            // offline or no internet → queue locally
            await insertPending(summary);
            setStatus('idle');
            void snapClear();
            return { summary, saved: false, error: new Error('Offline — saved locally') };
        } catch (e: any) {
            // remote failed (e.g., 401/500) → queue locally
            try { await insertPending(summary); } catch { }
            setStatus('idle');
            void snapClear();
            return {
                summary,
                saved: false,
                error: e instanceof Error ? e : new Error(String(e)),
            };
        }
    }, [distance, elapsed, points, token]);

    const pause = useCallback(() => {
        clearWatchers();
        stopTimer();
        setStatus('paused');
    }, []);

    const resume = useCallback(async () => {
        if (status !== 'paused') return;

        startTsRef.current = Date.now() - elapsed * 1000;
        startTimer();

        if (Platform.OS === 'web') {
            if (!('geolocation' in navigator)) return;
            webWatchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    handlePoint({
                        ts: Date.now(),
                        lat: pos.coords.latitude,
                        lon: pos.coords.longitude,
                        alt: (pos.coords.altitude as number | null) ?? null,
                    });
                },
                (err) => console.warn('web watchPosition error:', err),
                { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
            );
        } else {
            nativeSubRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Highest,
                    distanceInterval: 1,
                    timeInterval: 0,
                    mayShowUserSettingsDialog: true,
                },
                (loc) => {
                    handlePoint({
                        ts: Date.now(),
                        lat: loc.coords.latitude,
                        lon: loc.coords.longitude,
                        alt: loc.coords.altitude ?? null,
                        acc: loc.coords.accuracy ?? undefined,
                    });
                }
            );
        }

        setStatus('recording');
    }, [elapsed, status, handlePoint]);

    // ---------- Ingest buffered background points before stopping ----------
    const ingest = useCallback((buffered: TrackPoint[]) => {
        if (!buffered?.length) return;
        for (const p of buffered) handlePoint(p);
    }, [handlePoint]);

    // ---------- Snapshot persistence (debounced) ----------
    const saveSnapshotDebounceRef = useRef<number | null>(null);
    useEffect(() => {
        if (status === 'recording' || status === 'paused') {
            if (saveSnapshotDebounceRef.current) clearTimeout(saveSnapshotDebounceRef.current);
            saveSnapshotDebounceRef.current = setTimeout(() => {
                void snapSet({
                    startTs: startTsRef.current,
                    elapsed,
                    distance,
                    points,
                    status,
                });
                saveSnapshotDebounceRef.current = null;
            }, 1500) as unknown as number;
        }
    }, [status, elapsed, distance, points]);

    // Try to restore a paused/in-progress track on mount (e.g., app was killed)
    useEffect(() => {
        (async () => {
            const snap = await snapGet<{
                startTs: number;
                elapsed: number;
                distance: number;
                points: TrackPoint[];
                status: RecorderStatus;
            }>();
            if (snap && (snap.status === 'recording' || snap.status === 'paused') && snap.points?.length) {
                startTsRef.current = snap.startTs || Date.now();
                setElapsed(snap.elapsed || 0);
                setDistance(snap.distance || 0);
                setPoints(snap.points || []);
                setStatus('paused');
                showToast({ type: 'success', msg: 'Recovered in-progress hike' });
            }
        })();
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearWatchers();
            stopTimer();
        };
    }, []);

    return { status, elapsed, distance, points, start, stop, pause, resume, ingest };
}



// import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import { Platform } from 'react-native';
// import * as Location from 'expo-location';
// import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
// import { saveHike } from '../lib/db';
// import { useAuthToken } from '../lib/userAuthToken';
// import { decodeUserId } from '../lib/useCurrentUser';
// import { showToast } from '../lib/showToast';
// import type { RecorderStatus, TrackPoint } from '@/types';

// // Optional native storage (falls back to localStorage on web)
// let AsyncStorage: {
//     getItem(key: string): Promise<string | null>;
//     setItem(key: string, v: string): Promise<void>;
//     removeItem(key: string): Promise<void>;
// } | null = null;

// if (Platform.OS !== 'web') {
//     try {
//         // eslint-disable-next-line @typescript-eslint/no-var-requires
//         AsyncStorage = require('@react-native-async-storage/async-storage').default;
//     } catch {
//         AsyncStorage = null; // if the package isn't installed, snapshots just won't persist on native
//     }
// }

// const R = 6371000; // meters
// const SNAPSHOT_KEY = 'trailRecorder.snapshot.v1';

// // ------------------------- distance helper -------------------------
// function haversine(a: TrackPoint, b: TrackPoint) {
//     const toRad = (v: number) => (v * Math.PI) / 180;
//     const dLat = toRad(b.lat - a.lat);
//     const dLon = toRad(b.lon - a.lon);
//     const A =
//         Math.sin(dLat / 2) ** 2 +
//         Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
//     return 2 * R * Math.asin(Math.sqrt(A));
// }

// // ------------------------- snapshot storage -------------------------
// async function snapSet(value: unknown) {
//     const s = JSON.stringify(value);
//     if (Platform.OS === 'web') {
//         try {
//             localStorage.setItem(SNAPSHOT_KEY, s);
//         } catch { }
//     } else if (AsyncStorage) {
//         try {
//             await AsyncStorage.setItem(SNAPSHOT_KEY, s);
//         } catch { }
//     }
// }

// async function snapGet<T>() {
//     try {
//         if (Platform.OS === 'web') {
//             const raw = localStorage.getItem(SNAPSHOT_KEY);
//             return raw ? (JSON.parse(raw) as T) : null;
//         } else if (AsyncStorage) {
//             const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
//             return raw ? (JSON.parse(raw) as T) : null;
//         }
//     } catch { }
//     return null;
// }

// async function snapClear() {
//     try {
//         if (Platform.OS === 'web') {
//             localStorage.removeItem(SNAPSHOT_KEY);
//         } else if (AsyncStorage) {
//             await AsyncStorage.removeItem(SNAPSHOT_KEY);
//         }
//     } catch { }
// }

// type StopResult = {
//     saved: boolean;
//     summary: {
//         trailId: string;
//         startedAt: number;
//         endedAt: number;
//         distance_m: number;
//         duration_s: number;
//         points: TrackPoint[];
//     };
//     error?: Error;
// };

// export default function useTrailRecorder() {
//     const [status, setStatus] = useState<RecorderStatus>('idle');
//     const [elapsed, setElapsed] = useState(0);
//     const [distance, setDistance] = useState(0);
//     const [points, setPoints] = useState<TrackPoint[]>(() => []);

//     // Watchers for each platform
//     const nativeSubRef = useRef<Location.LocationSubscription | null>(null);
//     const webWatchIdRef = useRef<number | null>(null);

//     const tickRef = useRef<number | null>(null);
//     const startTsRef = useRef<number>(0);
//     const lastRef = useRef<TrackPoint | null>(null);

//     // Keep-awake on native only (web uses Wake Lock elsewhere)
//     useEffect(() => {
//         let active = false;
//         (async () => {
//             if (status === 'recording' && Platform.OS !== 'web') {
//                 await activateKeepAwakeAsync('trail-recorder');
//                 active = true;
//             }
//         })();
//         return () => {
//             if (active && Platform.OS !== 'web') {
//                 deactivateKeepAwake('trail-recorder');
//             }
//         };
//     }, [status]);

//     // Filters (prod)
//     const MIN_ACCURACY_M = 30;  // discard noisy fixes (>30 m)
//     const MAX_SPEED_MS = 12;    // discard unrealistic jumps (>12 m/s)
//     const MAX_JUMP_M = 120;     // discard single huge hops

//     const handlePoint = useCallback((p: TrackPoint & { acc?: number }) => {
//         const last = lastRef.current;

//         // accuracy gate (if provided)
//         if (typeof p.acc === 'number' && p.acc > MIN_ACCURACY_M) {
//             return;
//         }

//         if (last) {
//             const d = haversine(last, p);                 // meters
//             const dt = Math.max(1, (p.ts - last.ts) / 1000); // seconds
//             const v = d / dt;                             // m/s

//             // Teleport or insane speed? drop it.
//             if (d > MAX_JUMP_M || v > MAX_SPEED_MS) {
//                 return;
//             }

//             setDistance(x => x + d);
//         }

//         lastRef.current = p;
//         setPoints(prev => (Array.isArray(prev) ? prev.concat(p) : [p]));
//     }, []);

//     function startTimer() {
//         tickRef.current = setInterval(() => {
//             setElapsed(Math.floor((Date.now() - startTsRef.current) / 1000));
//         }, 1000) as unknown as number;
//     }

//     function stopTimer() {
//         if (tickRef.current) {
//             clearInterval(tickRef.current);
//             tickRef.current = null;
//         }
//     }

//     function clearWatchers() {
//         // native
//         try {
//             nativeSubRef.current?.remove?.();
//         } catch {
//             // ignore
//         } finally {
//             nativeSubRef.current = null;
//         }
//         // web
//         try {
//             if (webWatchIdRef.current != null && typeof navigator !== 'undefined') {
//                 navigator.geolocation?.clearWatch?.(webWatchIdRef.current);
//             }
//         } catch {
//             // ignore
//         } finally {
//             webWatchIdRef.current = null;
//         }
//     }

//     const start = useCallback(async () => {
//         // Request permission explicitly only on native (browser will prompt on first geolocation use)
//         if (Platform.OS !== 'web') {
//             const { status: perm } = await Location.requestForegroundPermissionsAsync();
//             if (perm !== 'granted') throw new Error('Location permission denied');
//         }

//         startTsRef.current = Date.now();
//         setElapsed(0);
//         setDistance(0);
//         setPoints([]);
//         lastRef.current = null;

//         startTimer();

//         if (Platform.OS === 'web') {
//             if (!('geolocation' in navigator)) {
//                 throw new Error('Geolocation not supported in this browser');
//             }
//             // Browser geolocation
//             webWatchIdRef.current = navigator.geolocation.watchPosition(
//                 (pos) => {
//                     handlePoint({
//                         ts: Date.now(),
//                         lat: pos.coords.latitude,
//                         lon: pos.coords.longitude,
//                         alt: (pos.coords.altitude as number | null) ?? null,
//                     });
//                 },
//                 (err) => {
//                     console.warn('web watchPosition error:', err);
//                 },
//                 { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
//             );
//         } else {
//             // Native (Expo Location)
//             nativeSubRef.current = await Location.watchPositionAsync(
//                 {
//                     accuracy: Location.Accuracy.Highest,
//                     distanceInterval: 1,
//                     timeInterval: 2000,
//                     mayShowUserSettingsDialog: true,
//                 },
//                 (loc) => {
//                     handlePoint({
//                         ts: Date.now(),
//                         lat: loc.coords.latitude,
//                         lon: loc.coords.longitude,
//                         alt: loc.coords.altitude ?? null,
//                         acc: loc.coords.accuracy ?? undefined,
//                     });
//                 }
//             );
//         }

//         setStatus('recording');
//     }, [handlePoint]);

//     // ---------- Auth / User ----------
//     const { token } = useAuthToken();
//     const user_id = useMemo(() => decodeUserId(token), [token]);
//     const userIdRef = useRef<string | null>(null);
//     useEffect(() => {
//         userIdRef.current = user_id;
//     }, [user_id]);

//     // ---------- Stop returns success/failure ----------
//     const stop = useCallback(async (): Promise<StopResult> => {
//         clearWatchers();
//         stopTimer();

//         const summary = {
//             trailId: (globalThis as any).crypto?.randomUUID?.() ?? String(Date.now()),
//             startedAt: startTsRef.current,
//             endedAt: Date.now(),
//             distance_m: Math.round(distance),
//             duration_s: elapsed,
//             points,
//         };

//         const uid = userIdRef.current;
//         if (!uid) {
//             setStatus('idle');
//             return { summary, saved: false, error: new Error('Not logged in') };
//         }

//         try {
//             const hike = {
//                 trailId: summary.trailId,
//                 started_at: summary.startedAt,
//                 ended_at: summary.endedAt,
//                 distance_m: summary.distance_m,
//                 duration_s: summary.duration_s,
//                 points_json: JSON.stringify(summary.points),
//             };
//             await saveHike(hike, token);
//             setStatus('idle');
//             // clear snapshot since we have a canonical save now
//             void snapClear();
//             return { summary, saved: true };
//         } catch (e: any) {
//             console.warn('Failed to insert hike:', e);
//             setStatus('idle');
//             // keep snapshot around so user can retry later
//             return { summary, saved: false, error: e instanceof Error ? e : new Error(String(e)) };
//         }
//     }, [distance, elapsed, points, token]);

//     const pause = useCallback(() => {
//         clearWatchers();
//         stopTimer();
//         setStatus('paused');
//     }, []);

//     const resume = useCallback(async () => {
//         if (status !== 'paused') return;

//         startTsRef.current = Date.now() - elapsed * 1000;
//         startTimer();

//         if (Platform.OS === 'web') {
//             if (!('geolocation' in navigator)) return;
//             webWatchIdRef.current = navigator.geolocation.watchPosition(
//                 (pos) => {
//                     handlePoint({
//                         ts: Date.now(),
//                         lat: pos.coords.latitude,
//                         lon: pos.coords.longitude,
//                         alt: (pos.coords.altitude as number | null) ?? null,
//                     });
//                 },
//                 (err) => {
//                     console.warn('web watchPosition error:', err);
//                 },
//                 { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
//             );
//         } else {
//             nativeSubRef.current = await Location.watchPositionAsync(
//                 {
//                     accuracy: Location.Accuracy.Highest,
//                     distanceInterval: 1,
//                     timeInterval: 0,
//                     mayShowUserSettingsDialog: true,
//                 },
//                 (loc) => {
//                     handlePoint({
//                         ts: Date.now(),
//                         lat: loc.coords.latitude,
//                         lon: loc.coords.longitude,
//                         alt: loc.coords.altitude ?? null,
//                         acc: loc.coords.accuracy ?? undefined,
//                     });
//                 }
//             );
//         }

//         setStatus('recording');
//     }, [elapsed, status, handlePoint]);

//     // ---------- Ingest buffered background points before stopping ----------
//     const ingest = useCallback((buffered: TrackPoint[]) => {
//         if (!buffered?.length) return;
//         // Append carefully via the same quality gates as live points
//         for (const p of buffered) {
//             handlePoint(p);
//         }
//     }, [handlePoint]);

//     // ---------- Snapshot persistence (debounced) ----------
//     const saveSnapshotDebounceRef = useRef<number | null>(null);
//     useEffect(() => {
//         if (status === 'recording' || status === 'paused') {
//             if (saveSnapshotDebounceRef.current) {
//                 clearTimeout(saveSnapshotDebounceRef.current);
//             }
//             saveSnapshotDebounceRef.current = setTimeout(() => {
//                 void snapSet({
//                     startTs: startTsRef.current,
//                     elapsed,
//                     distance,
//                     points,
//                     status,
//                 });
//                 saveSnapshotDebounceRef.current = null;
//             }, 1500) as unknown as number;
//         }
//         // no cleanup required here beyond clearing timeout on next effect run
//     }, [status, elapsed, distance, points]);

//     // Try to restore a paused/in-progress track on mount (e.g., app was killed)
//     useEffect(() => {
//         (async () => {
//             const snap = await snapGet<{
//                 startTs: number;
//                 elapsed: number;
//                 distance: number;
//                 points: TrackPoint[];
//                 status: RecorderStatus;
//             }>();
//             if (snap && (snap.status === 'recording' || snap.status === 'paused') && snap.points?.length) {
//                 startTsRef.current = snap.startTs || Date.now();
//                 setElapsed(snap.elapsed || 0);
//                 setDistance(snap.distance || 0);
//                 setPoints(snap.points || []);
//                 // Restore to paused so user decides to resume/stop
//                 setStatus('paused');
//                 showToast({ type: 'success', msg: 'Recovered in-progress hike' });
//             }
//         })();
//     }, []);

//     // Cleanup on unmount
//     useEffect(() => {
//         return () => {
//             clearWatchers();
//             stopTimer();
//         };
//     }, []);

//     return { status, elapsed, distance, points, start, stop, pause, resume, ingest };
// }



// // import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// // import { Platform } from 'react-native';
// // import * as Location from 'expo-location';
// // import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
// // import { saveHike } from '../lib/db';
// // import { useAuthToken } from '../lib/userAuthToken';
// // import { decodeUserId } from '../lib/useCurrentUser';
// // import { showToast } from '../lib/showToast';
// // import type { RecorderStatus, TrackPoint } from '@/types';

// // const R = 6371000; // meters

// // function haversine(a: TrackPoint, b: TrackPoint) {
// //     const toRad = (v: number) => (v * Math.PI) / 180;
// //     const dLat = toRad(b.lat - a.lat);
// //     const dLon = toRad(b.lon - a.lon);
// //     const A =
// //         Math.sin(dLat / 2) ** 2 +
// //         Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
// //     return 2 * R * Math.asin(Math.sqrt(A));
// // }

// // export default function useTrailRecorder() {
// //     const [status, setStatus] = useState<RecorderStatus>('idle');
// //     const [elapsed, setElapsed] = useState(0);
// //     const [distance, setDistance] = useState(0);
// //     const [points, setPoints] = useState<TrackPoint[]>(() => []);

// //     // Watchers for each platform
// //     const nativeSubRef = useRef<Location.LocationSubscription | null>(null);
// //     const webWatchIdRef = useRef<number | null>(null);

// //     const tickRef = useRef<number | null>(null);
// //     const startTsRef = useRef<number>(0);
// //     const lastRef = useRef<TrackPoint | null>(null);

// //     // Keep-awake on native only (web uses Wake Lock elsewhere)
// //     useEffect(() => {
// //         let active = false;
// //         (async () => {
// //             if (status === 'recording' && Platform.OS !== 'web') {
// //                 await activateKeepAwakeAsync('trail-recorder');
// //                 active = true;
// //             }
// //         })();
// //         return () => {
// //             if (active && Platform.OS !== 'web') {
// //                 deactivateKeepAwake('trail-recorder');
// //             }
// //         };
// //     }, [status]);

// //     // Production
// //     const MIN_ACCURACY_M = 30;      // discard noisy fixes (>30 m)
// //     const MAX_SPEED_MS = 12;        // discard unrealistic jumps (>12 m/s)
// //     const MAX_JUMP_M = 120;         // discard single huge hops (e.g., tower handoffs)

// //     // Dev
// //     // const MIN_ACCURACY_M = 1000;
// //     // const MAX_SPEED_MS = 100;
// //     // const MAX_JUMP_M = 10000;


// //     const handlePoint = useCallback((p: TrackPoint & { acc?: number }) => {

// //         const last = lastRef.current;

// //         // If we have an accuracy value and it's poor, skip
// //         if (typeof p.acc === 'number' && p.acc > MIN_ACCURACY_M) {
// //             return;
// //         }

// //         if (last) {
// //             const d = haversine(last, p);         // meters
// //             const dt = Math.max(1, (p.ts - last.ts) / 1000); // seconds
// //             const v = d / dt;                     // m/s

// //             // Teleport or insane speed? drop it.
// //             if (d > MAX_JUMP_M || v > MAX_SPEED_MS) {
// //                 return;
// //             }

// //             // Accept increment
// //             setDistance(x => x + d);
// //         }

// //         lastRef.current = p;
// //         setPoints(prev => (Array.isArray(prev) ? prev.concat(p) : [p]));
// //     }, []);

// //     function startTimer() {
// //         tickRef.current = setInterval(() => {
// //             setElapsed(Math.floor((Date.now() - startTsRef.current) / 1000));
// //         }, 1000) as unknown as number;
// //     }

// //     function stopTimer() {
// //         if (tickRef.current) {
// //             clearInterval(tickRef.current);
// //             tickRef.current = null;
// //         }
// //     }

// //     function clearWatchers() {
// //         // native
// //         try {
// //             nativeSubRef.current?.remove?.();
// //         } catch (e) {
// //             // ignore
// //         } finally {
// //             nativeSubRef.current = null;
// //         }
// //         // web
// //         try {
// //             if (webWatchIdRef.current != null && typeof navigator !== 'undefined') {
// //                 navigator.geolocation?.clearWatch?.(webWatchIdRef.current);
// //             }
// //         } catch (e) {
// //             // ignore
// //         } finally {
// //             webWatchIdRef.current = null;
// //         }
// //     }

// //     const start = useCallback(async () => {
// //         // Request permission explicitly only on native (browser will prompt on first geolocation use)
// //         if (Platform.OS !== 'web') {
// //             const { status: perm } = await Location.requestForegroundPermissionsAsync();
// //             if (perm !== 'granted') throw new Error('Location permission denied');
// //         }

// //         startTsRef.current = Date.now();
// //         setElapsed(0);
// //         setDistance(0);
// //         setPoints([]);
// //         lastRef.current = null;

// //         startTimer();

// //         if (Platform.OS === 'web') {
// //             if (!('geolocation' in navigator)) {
// //                 throw new Error('Geolocation not supported in this browser');
// //             }
// //             // Browser geolocation
// //             webWatchIdRef.current = navigator.geolocation.watchPosition(
// //                 (pos) => {
// //                     handlePoint({
// //                         ts: Date.now(),
// //                         lat: pos.coords.latitude,
// //                         lon: pos.coords.longitude,
// //                         alt: (pos.coords.altitude as number | null) ?? null,
// //                     });
// //                 },
// //                 (err) => {
// //                     console.warn('web watchPosition error:', err);
// //                 },
// //                 { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
// //             );
// //         } else {
// //             // Native (Expo Location)

// //             nativeSubRef.current = await Location.watchPositionAsync(
// //                 {
// //                     accuracy: Location.Accuracy.Highest, // or Highest
// //                     // Let distance drive updates; timeInterval can throttle on some devices
// //                     distanceInterval: 1,           // was 3
// //                     timeInterval: 2000,
// //                     mayShowUserSettingsDialog: true,
// //                 },
// //                 (loc) => {
// //                     handlePoint({
// //                         ts: Date.now(),
// //                         lat: loc.coords.latitude,
// //                         lon: loc.coords.longitude,
// //                         alt: loc.coords.altitude ?? null,
// //                         acc: loc.coords.accuracy ?? undefined,  // pass accuracy
// //                     });
// //                 }
// //             );
// //         }

// //         setStatus('recording');
// //     }, [handlePoint]);

// //     const { token } = useAuthToken();
// //     const user_id = useMemo(() => decodeUserId(token), [token]);
// //     const userIdRef = useRef<string | null>(null);
// //     useEffect(() => {
// //         userIdRef.current = user_id;
// //     }, [user_id]);

// //     // useTrailRecorder.ts
// //     const stop = useCallback(async () => {
// //         clearWatchers();
// //         stopTimer();

// //         const uid = userIdRef.current;
// //         const summary = {
// //             trailId: (globalThis as any).crypto?.randomUUID?.() ?? String(Date.now()),
// //             startedAt: startTsRef.current,
// //             endedAt: Date.now(),
// //             distance_m: Math.round(distance),
// //             duration_s: elapsed,
// //             points,
// //         };

// //         if (!uid) {
// //             setStatus('idle');
// //             return { summary, saved: false, error: new Error('Not logged in') };
// //         }

// //         try {
// //             const hike = {
// //                 trailId: summary.trailId,
// //                 started_at: summary.startedAt,
// //                 ended_at: summary.endedAt,
// //                 distance_m: summary.distance_m,
// //                 duration_s: summary.duration_s,
// //                 points_json: JSON.stringify(summary.points),
// //             };
// //             await saveHike(hike, token);
// //             setStatus('idle');
// //             return { summary, saved: true as const };
// //         } catch (e) {
// //             console.warn('Failed to insert hike:', e);
// //             setStatus('idle');
// //             return { summary, saved: false as const, error: e as Error };
// //         }
// //     }, [distance, elapsed, points, token]);


// //     // const stop = useCallback(async () => {
// //     //     clearWatchers();
// //     //     stopTimer();

// //     //     const uid = userIdRef.current;
// //     //     if (!uid) {
// //     //         setStatus('idle');
// //     //         return showToast({
// //     //             type: 'error',
// //     //             msg: 'Could not save hike, please log in and try again.',
// //     //         });
// //     //     }

// //     //     const summary = {
// //     //         trailId:
// //     //             (globalThis as any).crypto?.randomUUID?.() ?? String(Date.now()),
// //     //         startedAt: startTsRef.current,
// //     //         endedAt: Date.now(),
// //     //         distance_m: Math.round(distance),
// //     //         duration_s: elapsed,
// //     //         points,
// //     //     };

// //     //     try {
// //     //         const hike = {
// //     //             trailId: summary.trailId,
// //     //             started_at: summary.startedAt,
// //     //             ended_at: summary.endedAt,
// //     //             distance_m: summary.distance_m,
// //     //             duration_s: summary.duration_s,
// //     //             points_json: JSON.stringify(summary.points),
// //     //         };
// //     //         await saveHike(hike, token);
// //     //     } catch (e) {
// //     //         console.warn('Failed to insert hike:', e);
// //     //     }

// //     //     setStatus('idle');
// //     //     return summary;
// //     // }, [distance, elapsed, points, token]);

// //     const pause = useCallback(() => {
// //         clearWatchers();
// //         stopTimer();
// //         setStatus('paused');
// //     }, []);

// //     const resume = useCallback(async () => {
// //         if (status !== 'paused') return;

// //         startTsRef.current = Date.now() - elapsed * 1000;
// //         startTimer();

// //         if (Platform.OS === 'web') {
// //             if (!('geolocation' in navigator)) return;
// //             webWatchIdRef.current = navigator.geolocation.watchPosition(
// //                 (pos) => {
// //                     handlePoint({
// //                         ts: Date.now(),
// //                         lat: pos.coords.latitude,
// //                         lon: pos.coords.longitude,
// //                         alt: (pos.coords.altitude as number | null) ?? null,
// //                     });
// //                 },
// //                 (err) => {
// //                     console.warn('web watchPosition error:', err);
// //                 },
// //                 { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
// //             );
// //         } else {

// //             nativeSubRef.current = await Location.watchPositionAsync(
// //                 {
// //                     accuracy: Location.Accuracy.Highest, // or Highest
// //                     // Let distance drive updates; timeInterval can throttle on some devices
// //                     distanceInterval: 1,           // was 3
// //                     timeInterval: 0,
// //                     mayShowUserSettingsDialog: true,
// //                 },
// //                 (loc) => {
// //                     handlePoint({
// //                         ts: Date.now(),
// //                         lat: loc.coords.latitude,
// //                         lon: loc.coords.longitude,
// //                         alt: loc.coords.altitude ?? null,
// //                         acc: loc.coords.accuracy ?? undefined,  // pass accuracy
// //                     });
// //                 }
// //             );
// //         }

// //         setStatus('recording');
// //     }, [elapsed, status, handlePoint]);

// //     // Cleanup on unmount
// //     useEffect(() => {
// //         return () => {
// //             clearWatchers();
// //             stopTimer();
// //         };
// //     }, []);


// //     const ingest = useCallback((buffered: TrackPoint[]) => {
// //         if (!buffered?.length) return;
// //         // Append, recompute distance safely against lastRef
// //         for (const p of buffered) {
// //             handlePoint(p);
// //         }
// //     }, [handlePoint]);

// //     return { status, elapsed, distance, points, start, stop, pause, resume, ingest };
// // }
