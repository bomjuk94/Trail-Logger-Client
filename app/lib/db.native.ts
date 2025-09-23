import NetInfo from '@react-native-community/netinfo'
import { apiFetch } from './apiFetch';
import { decodeUserId } from './useCurrentUser';
import * as SQLite from 'expo-sqlite';
import { showToast } from './showToast';
import type { HikeRow } from '@/types';

let _db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<void> | null = null;

export function db() {
    if (!_db) _db = SQLite.openDatabaseSync('trails.db');
    return _db;
}

export async function ensureDb(): Promise<void> {
    if (_initPromise) return _initPromise;
    _initPromise = (async () => {
        await db().execAsync(`
        CREATE TABLE IF NOT EXISTS hikes (
        trailId TEXT PRIMARY KEY NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER NOT NULL,
        distance_m INTEGER NOT NULL,
        duration_s INTEGER NOT NULL,
        points_json TEXT NOT NULL
    );
    `);
    })();
    return _initPromise;
}

export async function saveHike(hike: HikeRow, token: string | null) {
    const userId = decodeUserId(token);
    if (!userId) throw new Error("Not authenticated");

    await insertHike({ ...hike });

    const net = await NetInfo.fetch();
    if (!net.isConnected) return; // offline → will sync later

    try {
        const res = await apiFetch(`/api/trails/${hike.trailId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                started_at: hike.started_at,
                ended_at: hike.ended_at,
                distance_m: hike.distance_m,
                duration_s: hike.duration_s,
                points_json: hike.points_json,
            }),
        });
        if (res.ok) {
            showToast({ type: "success", msg: "Trail has been saved successfully!" })
        } else {
            throw new Error(`HTTP ${res.status}`)
        }
    } catch (e) {
        console.warn('Failed to sync hike to server:', e);
    }
}

export async function insertHike(row: HikeRow): Promise<void> {
    await ensureDb();
    await db().runAsync(
        `INSERT INTO hikes (trailId, started_at, ended_at, distance_m, duration_s, points_json)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [row.trailId, row.started_at, row.ended_at, row.distance_m, row.duration_s, row.points_json]
    );
}

export async function listHikes(userId: string): Promise<HikeRow[]> {

    await ensureDb();

    return db().getAllAsync<HikeRow>(
        `
    SELECT trailId, started_at, ended_at, distance_m, duration_s, points_json
    FROM hikes
    ORDER BY started_at DESC
    `,
        [userId]
    );
}
