import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase | null {
    if (Platform.OS === 'web') return null;
    if (!db) db = SQLite.openDatabaseSync('trails.db'); // sync API
    return db;
}

export function listPending(): Array<{
    trailId: string;
    started_at: number;
    ended_at: number;
    distance_m: number;
    duration_s: number;
    points_json: string;
}> {
    const d = getDb();
    if (!d) {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('pending_hikes_'));
        return keys.map((k) => JSON.parse(localStorage.getItem(k) || 'null')).filter(Boolean);
    }
    const rs = d.getAllSync(`
    SELECT trailId, started_at, ended_at, distance_m, duration_s, points_json
    FROM pending_hikes
    WHERE sync_status='pending'
    ORDER BY created_at ASC
    LIMIT 25;
  `);
    return rs as any;
}

export function deletePending(trailId: string) {
    const d = getDb();
    if (!d) {
        try { localStorage.removeItem(`pending_hikes_${trailId}`); } catch { }
        return;
    }
    d.runSync(`DELETE FROM pending_hikes WHERE trailId=?`, [trailId]);
}

export function markPendingError(trailId: string, err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const d = getDb();
    if (!d) return;
    d.runSync(
        `UPDATE pending_hikes SET last_error=?, sync_status='pending' WHERE trailId=?`,
        [msg, trailId]
    );
}
