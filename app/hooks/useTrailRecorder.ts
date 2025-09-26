import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { saveHike } from '../lib/db';
import { useAuthToken } from '../lib/userAuthToken';
import { decodeUserId } from '../lib/useCurrentUser';
import { showToast } from '../lib/showToast';
import type { RecorderStatus, TrackPoint } from '@/types';

const R = 6371000; // meters

function haversine(a: TrackPoint, b: TrackPoint) {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const A =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(A));
}

export default function useTrailRecorder() {
    const [status, setStatus] = useState<RecorderStatus>('idle');
    const [elapsed, setElapsed] = useState(0);
    const [distance, setDistance] = useState(0);
    const [points, setPoints] = useState<TrackPoint[]>(() => []);

    // Watchers for each platform
    const nativeSubRef = useRef<Location.LocationSubscription | null>(null);
    const webWatchIdRef = useRef<number | null>(null);

    const tickRef = useRef<number | null>(null);
    const startTsRef = useRef<number>(0);
    const lastRef = useRef<TrackPoint | null>(null);

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

    // Production
    const MIN_ACCURACY_M = 30;      // discard noisy fixes (>30 m)
    const MAX_SPEED_MS = 12;        // discard unrealistic jumps (>12 m/s)
    const MAX_JUMP_M = 120;         // discard single huge hops (e.g., tower handoffs)

    // Dev
    // const MIN_ACCURACY_M = 1000;
    // const MAX_SPEED_MS = 100;
    // const MAX_JUMP_M = 10000;


    const handlePoint = useCallback((p: TrackPoint & { acc?: number }) => {

        const last = lastRef.current;

        // If we have an accuracy value and it's poor, skip
        if (typeof p.acc === 'number' && p.acc > MIN_ACCURACY_M) {
            return;
        }

        if (last) {
            const d = haversine(last, p);         // meters
            const dt = Math.max(1, (p.ts - last.ts) / 1000); // seconds
            const v = d / dt;                     // m/s

            // Teleport or insane speed? drop it.
            if (d > MAX_JUMP_M || v > MAX_SPEED_MS) {
                return;
            }

            // Accept increment
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
        // native
        try {
            nativeSubRef.current?.remove?.();
        } catch (e) {
            // ignore
        } finally {
            nativeSubRef.current = null;
        }
        // web
        try {
            if (webWatchIdRef.current != null && typeof navigator !== 'undefined') {
                navigator.geolocation?.clearWatch?.(webWatchIdRef.current);
            }
        } catch (e) {
            // ignore
        } finally {
            webWatchIdRef.current = null;
        }
    }

    const start = useCallback(async () => {
        // Request permission explicitly only on native (browser will prompt on first geolocation use)
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
            if (!('geolocation' in navigator)) {
                throw new Error('Geolocation not supported in this browser');
            }
            // Browser geolocation
            webWatchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    handlePoint({
                        ts: Date.now(),
                        lat: pos.coords.latitude,
                        lon: pos.coords.longitude,
                        alt: (pos.coords.altitude as number | null) ?? null,
                    });
                },
                (err) => {
                    console.warn('web watchPosition error:', err);
                },
                { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
            );
        } else {
            // Native (Expo Location)

            nativeSubRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Highest, // or Highest
                    // Let distance drive updates; timeInterval can throttle on some devices
                    distanceInterval: 1,           // was 3
                    timeInterval: 2000,
                    mayShowUserSettingsDialog: true,
                },
                (loc) => {
                    handlePoint({
                        ts: Date.now(),
                        lat: loc.coords.latitude,
                        lon: loc.coords.longitude,
                        alt: loc.coords.altitude ?? null,
                        acc: loc.coords.accuracy ?? undefined,  // pass accuracy
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

    const stop = useCallback(async () => {
        clearWatchers();
        stopTimer();

        const uid = userIdRef.current;
        if (!uid) {
            setStatus('idle');
            return showToast({
                type: 'error',
                msg: 'Could not save hike, please log in and try again.',
            });
        }

        const summary = {
            trailId:
                (globalThis as any).crypto?.randomUUID?.() ?? String(Date.now()),
            startedAt: startTsRef.current,
            endedAt: Date.now(),
            distance_m: Math.round(distance),
            duration_s: elapsed,
            points,
        };

        try {
            const hike = {
                trailId: summary.trailId,
                started_at: summary.startedAt,
                ended_at: summary.endedAt,
                distance_m: summary.distance_m,
                duration_s: summary.duration_s,
                points_json: JSON.stringify(summary.points),
            };
            await saveHike(hike, token);
        } catch (e) {
            console.warn('Failed to insert hike:', e);
        }

        setStatus('idle');
        return summary;
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
                (err) => {
                    console.warn('web watchPosition error:', err);
                },
                { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
            );
        } else {

            nativeSubRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Highest, // or Highest
                    // Let distance drive updates; timeInterval can throttle on some devices
                    distanceInterval: 1,           // was 3
                    timeInterval: 0,
                    mayShowUserSettingsDialog: true,
                },
                (loc) => {
                    handlePoint({
                        ts: Date.now(),
                        lat: loc.coords.latitude,
                        lon: loc.coords.longitude,
                        alt: loc.coords.altitude ?? null,
                        acc: loc.coords.accuracy ?? undefined,  // pass accuracy
                    });
                }
            );
        }

        setStatus('recording');
    }, [elapsed, status, handlePoint]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearWatchers();
            stopTimer();
        };
    }, []);

    return { status, elapsed, distance, points, start, stop, pause, resume };
}
