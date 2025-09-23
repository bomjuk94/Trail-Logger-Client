import { useEffect } from 'react';
import * as Location from 'expo-location';
import type { UseLocationProps } from '@/types/Location';

export const useLocation = () => {

    const userLocation = ({ setErrorMsg, setLocation }: UseLocationProps) => {
        useEffect(() => {
            (async () => {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setErrorMsg('Permission to access location was denied');
                    return;
                }

                let currentLocation = await Location.getCurrentPositionAsync({});
                setLocation(currentLocation);
            })();
        }, []);
    }

    return { userLocation }
}