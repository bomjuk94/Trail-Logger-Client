import { Platform } from 'react-native';
import {
    requestLocationPermissions,
    startBackgroundLocation,
    stopBackgroundLocation,
    isTracking,
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
                    if (!(await isTracking())) await startBackgroundLocation();
                }
                await recorder.start();
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
                    if (buffered?.length) {
                        // feed them into the recorder before stop
                        await recorder.ingest?.(buffered);
                    }
                }

                const result = await recorder.stop();
                if (result.saved) {
                    showToast({ type: 'success', msg: 'Hike saved to cloud' });
                } else {
                    const reason = result.error?.message ?? 'Network/auth issue';
                    showToast({
                        type: 'error',
                        msg: `Save failed: ${reason}. Saved locally; will retry.`,
                    });
                }
                return;
            }
        } catch (e: any) {
            console.warn('onPrimary error:', e);
            showToast({ type: 'error', msg: e?.message || 'Something went wrong' });
            if (wakeLocked) {
                try {
                    releaseWakeLock();
                } catch { }
            }
        }
    };

    const onSecondary = async () => {
        try {
            if (recorder.status === 'recording') {
                recorder.pause();
                showToast({ type: 'info', msg: 'Paused recording' });
            } else if (recorder.status === 'paused') {
                await recorder.resume();
                showToast({ type: 'success', msg: 'Resumed recording' });
            }
        } catch (e: any) {
            console.warn('onSecondary error:', e);
            showToast({ type: 'error', msg: e?.message || 'Pause/Resume failed' });
        }
    };

    return { onPrimary, onSecondary };
};
