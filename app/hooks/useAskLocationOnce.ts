import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getConfig } from '../lib/getConfig';

export async function ensureLocationPermissionOnce() {
    if (Platform.OS === 'web') {
        const { getAskedKey } = getConfig();
        const ASKED_KEY = getAskedKey().askedKey;
        const alreadyAsked = localStorage.getItem(ASKED_KEY);
        if (!alreadyAsked) localStorage.setItem(ASKED_KEY, '1');
        return { status: 'granted' as const, canAskAgain: true };
    }

    const { getAskedKey } = getConfig();
    const ASKED_KEY = getAskedKey().askedKey;
    const alreadyAsked = await AsyncStorage.getItem(ASKED_KEY);

    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

    if (status === 'granted') {
        if (!alreadyAsked) await AsyncStorage.setItem(ASKED_KEY, '1');
        return { status, canAskAgain };
    }

    if (!alreadyAsked && canAskAgain) {
        const req = await Location.requestForegroundPermissionsAsync();
        await AsyncStorage.setItem(ASKED_KEY, '1');
        return { status: req.status, canAskAgain: req.canAskAgain ?? true };
    }

    if (!alreadyAsked) await AsyncStorage.setItem(ASKED_KEY, '1');
    return { status, canAskAgain };
}
