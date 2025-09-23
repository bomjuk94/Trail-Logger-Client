export type HikeRow = {
    trailId: string;
    started_at: number;
    ended_at: number;
    distance_m: number;
    duration_s: number;
    points_json: string;
};
export interface UseHikePointsProps {
    hikes: HikeRow[],
    userWeight: number | null
}
export type HikeStats = {
    distanceKmTotal: number
    elevationGainTotal: number
    mostElevationGain: number
    highestPoint: number
    paceStr: string
    speedStr: string
    caloriesBurnedTotal: number
    longestHikeKm: number,
    fastestHikeS: number,
    longestHikeTimeS: number,
}
export interface UseFetchTrailsProps {
    setHikes: React.Dispatch<React.SetStateAction<HikeRow[]>>
}