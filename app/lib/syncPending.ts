import NetInfo from '@react-native-community/netinfo';
import { listPending, deletePending, markPendingError } from './localQueue';
import { saveHike } from '@/app/lib/db';

// returns number of synced items
export async function syncPendingHikes(token: string | null): Promise<number> {
    const net = await NetInfo.fetch();
    const online = !!net.isConnected && (net.isInternetReachable ?? true);
    if (!online || !token) return 0;

    const rows = listPending();
    let synced = 0;

    for (const row of rows) {
        const hike = {
            trailId: row.trailId,
            started_at: row.started_at,
            ended_at: row.ended_at,
            distance_m: row.distance_m,
            duration_s: row.duration_s,
            points_json: row.points_json,
        };
        try {
            await saveHike(hike, token);
            deletePending(row.trailId);
            synced++;
        } catch (e) {
            // keep it pending, but record the last error (helps debugging)
            markPendingError(row.trailId, e);
            // If it's an auth error (401/403), break early; token likely invalid.
            const msg = (e as any)?.message || '';
            if (msg.includes('401') || msg.includes('403')) break;
            // Otherwise move on to next (maybe server hiccup).
        }
    }

    return synced;
}
