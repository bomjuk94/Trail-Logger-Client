import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { LOCATION_TASK } from '../tasks/locationTask';

export async function requestLocationPermissions() {
    if (Platform.OS == 'web') return

    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') throw new Error('Foreground permission denied');

    if (Platform.OS === 'android') {
        const bg = await Location.requestBackgroundPermissionsAsync();
        if (bg.status !== 'granted') throw new Error('Background permission denied');
    }
}

export async function startBackgroundLocation() {
    if (Platform.OS === 'web') return

    if (!TaskManager.isTaskDefined(LOCATION_TASK)) {
        await import('../tasks/locationTask');
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.Highest,
        distanceInterval: 3,
        timeInterval: 2000,
        pausesUpdatesAutomatically: false,
        foregroundService: {
            notificationTitle: 'Trail Logger',
            notificationBody: 'Recording your hike…',
        },
        activityType: Location.ActivityType.Fitness,
        mayShowUserSettingsDialog: true,
        deferredUpdatesInterval: 0,
    });

    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
}

export async function stopBackgroundLocation() {
    if (Platform.OS === 'web') return;

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
    if (hasStarted) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}

export async function isTracking() {
    if (Platform.OS === 'web') return false

    return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
}
