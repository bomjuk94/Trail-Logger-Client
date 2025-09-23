export type RecorderStatus = 'idle' | 'recording' | 'paused';
export type TrackPoint = {
    ts: number;
    lat: number;
    lon: number;
    alt?: number | null;
};

export type Recorder = {
    status: RecorderStatus;
    elapsed: number;
    distance: number;
    points: TrackPoint[];
    start: () => Promise<void>;
    stop: () => Promise<void | {
        trailId: any;
        startedAt: number;
        endedAt: number;
        distance_m: number;
        duration_s: number;
        points: TrackPoint[];
    }>;
    pause: () => void;
    resume: () => Promise<void>;
} 