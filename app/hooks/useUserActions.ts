import { Platform } from 'react-native';
import {
    requestLocationPermissions,
    startBackgroundLocation,
    stopBackgroundLocation,
    isTracking
} from '../lib/backgroundLocation';
import { showToast } from '../lib/showToast';
import { drainBufferedPoints } from '../lib/backgroundSink';
import type { Recorder } from '@/types';
import { requestWakeLock, releaseWakeLock } from '../lib/wakeLock';

export const useUserActions = (recorder: Recorder) => {
    const onPrimary = async () => {
        let wakeLocked = false;

        try {
            if (recorder.status === 'idle') {
                if (Platform.OS === 'web') {
                    await requestWakeLock();
                    wakeLocked = true;
                } else {
                    await requestLocationPermissions();
                    // avoid double-starting the Android foreground service
                    if (!(await isTracking())) {
                        await startBackgroundLocation();
                    }
                }

                await recorder.start(); // your timers/state/etc.
                showToast({ type: 'success', msg: 'Recording started' });
                return;
            }

            if (recorder.status === 'recording' || recorder.status === 'paused') {
                if (Platform.OS === 'web') {
                    releaseWakeLock();
                    wakeLocked = false;
                } else {
                    await stopBackgroundLocation();
                    const buffered = await drainBufferedPoints();
                    void buffered; // or recorder.ingest?.(buffered)
                }

                const summary = await recorder.stop();
                showToast({ type: 'success', msg: 'Hike saved' });
                return;
            }
        } catch (e: any) {
            console.warn('onPrimary error:', e);
            showToast({ type: 'error', msg: e?.message || 'Something went wrong' });
            // cleanup if we grabbed a wake lock
            if (wakeLocked) {
                try { releaseWakeLock(); } catch { }
            }
        }
    };

    const onSecondary = async () => {
        if (recorder.status === 'recording') recorder.pause();
        else if (recorder.status === 'paused') await recorder.resume();
    };

    return { onPrimary, onSecondary };
};
