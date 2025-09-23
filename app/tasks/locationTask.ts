import * as TaskManager from 'expo-task-manager';
import type { LocationObject } from 'expo-location';
import { bufferPoints } from '../lib/backgroundSink';

export const LOCATION_TASK = 'trail-logger-location';

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
    if (error) {
        console.warn('Location task error:', error);
        return;
    }
    const { locations } = data as { locations: LocationObject[] };
    if (!locations?.length) return;

    const pts = locations.map(l => ({
        lat: l.coords.latitude,
        lon: l.coords.longitude,
        accuracy: l.coords.accuracy ?? null,
        altitude: l.coords.altitude ?? null,
        speed: l.coords.speed ?? null,
        heading: l.coords.heading ?? null,
        timestamp: l.timestamp
    }));

    try {
        await bufferPoints(pts);
    } catch (e) {
        console.warn('Failed to buffer points:', e);
    }
});
