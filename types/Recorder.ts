export type RecorderStatus = 'idle' | 'recording' | 'paused';
export type TrackPoint = {
    ts: number;          // epoch ms
    lat: number;
    lon: number;
    alt: number | null;
    // optional accuracy when available (native)
    acc?: number;
};

export type StopSummary = {
    trailId: string;
    startedAt: number;
    endedAt: number;
    distance_m: number;
    duration_s: number;
    points: TrackPoint[];
};

export type StopResult = {
    saved: boolean;
    summary: StopSummary;
    error?: Error;
};

export type Recorder {
    status: RecorderStatus;
    elapsed: number;
    distance: number;
    points: TrackPoint[];

    start(): Promise<void>;
    stop(): Promise<StopResult>;     // <-- was Promise<void | Summary>
    pause(): void;
    resume(): Promise<void>;

    // optional but present in your implementation
    ingest?(buffered: TrackPoint[]): void;
}

// export type Recorder = {
//     status: RecorderStatus;
//     elapsed: number;
//     distance: number;
//     points: TrackPoint[];
//     start: () => Promise<void>;
//     stop: () => Promise<void | {
//         trailId: any;
//         startedAt: number;
//         endedAt: number;
//         distance_m: number;
//         duration_s: number;
//         points: TrackPoint[];
//     }>;
//     pause: () => void;
//     resume: () => Promise<void>;
// } 