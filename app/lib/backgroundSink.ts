import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getConfig } from './getConfig';

const { getBkgdKey } = getConfig()
const BKGD_KEY = getBkgdKey().bkgdKey

export async function bufferPoints(points: any[]) {

    let prev

    if (Platform.OS === 'web') {
        prev = localStorage.getItem(BKGD_KEY)
    } else {
        prev = await AsyncStorage.getItem(BKGD_KEY);
    }
    const arr = prev ? JSON.parse(prev) : [];
    arr.push(...points);
    if (Platform.OS === 'web') {
        prev = localStorage.setItem(BKGD_KEY, JSON.stringify(arr))
    } else {
        await AsyncStorage.setItem(BKGD_KEY, JSON.stringify(arr));
    }
}

export async function drainBufferedPoints(): Promise<any[]> {

    let prev

    if (Platform.OS === 'web') {
        prev = localStorage.getItem(BKGD_KEY)
        localStorage.removeItem(BKGD_KEY)
    } else {
        prev = await AsyncStorage.getItem(BKGD_KEY);
        await AsyncStorage.removeItem(BKGD_KEY);
    }

    return prev ? JSON.parse(prev) : [];
}
