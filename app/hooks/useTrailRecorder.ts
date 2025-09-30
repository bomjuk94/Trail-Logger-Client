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

let AsyncStorage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, v: string): Promise<void>;
    removeItem(key: string): Promise<void>;
} | null = null;

if (Platform.OS !== 'web') {
    try {
        AsyncStorage = require('@react-native-async-storage/async-storage').default;
    } catch {
        AsyncStorage = null;
    }
}

const R = 6371000;
const SNAPSHOT_KEY = 'trailRecorder.snapshot.v1';

function haversine(a: TrackPoint, b: TrackPoint) {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const A =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(A));
}

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

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase | null {
    if (Platform.OS === 'web') return null; // skip web for now
    if (!db) {
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

export default function useTrailRecorder() {
    const [status, setStatus] = useState<RecorderStatus>('idle');
    const [elapsed, setElapsed] = useState(0);
    const [distance, setDistance] = useState(0);
    const [points, setPoints] = useState<TrackPoint[]>(() => []);

    const nativeSubRef = useRef<Location.LocationSubscription | null>(null);
    const webWatchIdRef = useRef<number | null>(null);

    const tickRef = useRef<number | null>(null);
    const startTsRef = useRef<number>(0);
    const lastRef = useRef<TrackPoint | null>(null);

    const statusRef = useRef<RecorderStatus>('idle');
    useEffect(() => { statusRef.current = status; }, [status]);

    function cancelSnapshotDebounce() {
        if (saveSnapshotDebounceRef.current) {
            clearTimeout(saveSnapshotDebounceRef.current);
            saveSnapshotDebounceRef.current = null;
        }
    }

    useEffect(() => {
        initLocalDb();
    }, []);

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

    const { token } = useAuthToken();
    const user_id = useMemo(() => decodeUserId(token), [token]);
    const userIdRef = useRef<string | null>(null);
    useEffect(() => {
        userIdRef.current = user_id;
    }, [user_id]);

    const stop = useCallback(async (): Promise<StopResult> => {
        clearWatchers();
        stopTimer();
        cancelSnapshotDebounce();

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
            try { await insertPending(summary); } catch { }
            void snapClear();
            return { summary, saved: false, error: new Error('Not logged in') };
        }

        const net = await NetInfo.fetch();
        const online = !!net.isConnected && (net.isInternetReachable ?? true);
        const canTryRemote = !!token && online;

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

            await insertPending(summary);
            setStatus('idle');
            void snapClear();
            return { summary, saved: false, error: new Error('Offline — saved locally') };
        } catch (e: any) {
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

    const ingest = useCallback((buffered: TrackPoint[]) => {
        if (!buffered?.length) return;
        for (const p of buffered) handlePoint(p);
    }, [handlePoint]);

    const saveSnapshotDebounceRef = useRef<number | null>(null);

    useEffect(() => {
        if (status === 'recording' || status === 'paused') {
            cancelSnapshotDebounce();
            saveSnapshotDebounceRef.current = setTimeout(() => {
                if (statusRef.current !== 'recording' && statusRef.current !== 'paused') return;
                void snapSet({
                    startTs: startTsRef.current,
                    elapsed,
                    distance,
                    points,
                    status: statusRef.current,
                });
                saveSnapshotDebounceRef.current = null;
            }, 1500) as unknown as number;
        } else {
            cancelSnapshotDebounce();
        }
    }, [status, elapsed, distance, points]);

    useEffect(() => {
        return () => {
            clearWatchers();
            stopTimer();
            cancelSnapshotDebounce()
        };
    }, []);

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

    const forceIdle = useCallback(() => {
        cancelSnapshotDebounce();
        clearWatchers();
        stopTimer();
        setStatus('idle');
        void snapClear();
    }, []);

    return { status, elapsed, distance, points, start, stop, pause, resume, ingest, forceIdle };
}
