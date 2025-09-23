import { useEffect } from "react"
import { Alert, Linking } from 'react-native';
import type { UseGetLocationPermissionProps } from "@/types/Location";

export const useGetLocationPermission = ({
    token,
    tokenLoading,
    ensureLocationPermissionOnce,
    setPermStatus
}: UseGetLocationPermissionProps) => {

    useEffect(() => {
        if (tokenLoading || !token) return;
        let mounted = true;
        (async () => {
            const { status, canAskAgain } = await ensureLocationPermissionOnce();
            if (!mounted) return;
            setPermStatus(status);
            if (status !== 'granted' && !canAskAgain) {
                Alert.alert(
                    'Location disabled',
                    'Enable location in Settings to see local weather.',
                    [
                        { text: 'Open Settings', onPress: () => Linking.openSettings() },
                        { text: 'Cancel' },
                    ],
                );
            }
        })();
        return () => {
            mounted = false;
        };
    }, [token, tokenLoading]);
}