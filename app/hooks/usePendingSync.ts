import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncPendingHikes } from '../lib/syncPending';
import { showToast } from '@/app/lib/showToast';

export function usePendingSync(token: string | null, forceIdle: () => void) {
    // on mount / token change
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!token) return;
            const n = await syncPendingHikes(token);
            if (!cancelled && n > 0) {
                forceIdle?.()
                showToast({ type: 'success', msg: `Synced ${n} hike${n > 1 ? 's' : ''}` });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token]);

    // on network regain
    useEffect(() => {
        if (!token) return;
        const unsub = NetInfo.addEventListener(async (state) => {
            const online = !!state.isConnected && (state.isInternetReachable ?? true);
            if (online) {
                const n = await syncPendingHikes(token);
                if (n > 0) {
                    forceIdle?.()
                    showToast({ type: 'success', msg: `Synced ${n} pending hike${n > 1 ? 's' : ''}` });
                }
            }
        });
        return () => unsub();
    }, [token]);
}
