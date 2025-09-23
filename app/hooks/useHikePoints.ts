import { useMemo } from "react"
import { UseHikePointsProps } from "@/types";
import { unitConverter } from "../lib/unitConverter";
import type { HikeStats } from "@/types";

export const useHikePoints = ({
    hikes,
    userWeight,
}: UseHikePointsProps) => {
    return useMemo<HikeStats>(() => {

        const hikesWithPts = hikes.map(h => ({
            ...h,
            pts: JSON.parse(h.points_json) as Array<{ alt?: number | null }>
        }));

        const distanceMetersTotal = hikes.reduce((sum, h) => sum + h.distance_m, 0);
        const distanceKmTotal = distanceMetersTotal / 1000;

        let elevationGainTotal = 0;
        let mostElevationGain = 0;
        for (const h of hikesWithPts) {
            let gain = 0;
            for (let i = 1; i < h.pts.length; i++) {
                const prevAlt = h.pts[i - 1].alt ?? 0;
                const currAlt = h.pts[i].alt ?? 0;
                const diff = currAlt - prevAlt;
                if (diff > 0) gain += diff;
            }
            elevationGainTotal += gain;
            if (gain > mostElevationGain) mostElevationGain = gain;
        }

        let highestPoint = 0;
        for (const h of hikesWithPts) {
            for (const p of h.pts) {
                const a = typeof p.alt === 'number' ? p.alt : null;
                if (a != null && a > highestPoint) highestPoint = a;
            }
        }

        const totalSeconds = hikes.reduce((s, h) => s + h.duration_s, 0);
        const totalHours = totalSeconds / 3600;
        const paceMinPerKm = distanceKmTotal > 0 ? (totalSeconds / 60) / distanceKmTotal : 0;
        const pm = Math.floor(paceMinPerKm);
        const ps = Math.round((paceMinPerKm - pm) * 60);
        const paceStr = distanceKmTotal > 0 ? `${pm}:${String(ps).padStart(2, '0')} /km` : '0:00 /km';

        const speedKmH = totalHours > 0 ? distanceKmTotal / totalHours : 0;
        const speedStr = `${speedKmH.toFixed(2)} km/h`;

        const { gramsToKg } = unitConverter()
        const userWeightKg = Number(gramsToKg(userWeight ?? 0))

        const caloriesBurnedTotal = hikes.reduce((sum, h) => {
            const km = h.distance_m / 1000;
            const hr = h.duration_s / 3600;
            if (hr <= 0) return sum;

            const spd = km / hr;
            const MET = spd <= 0 ? 0 : spd < 5 ? 3 : spd < 7 ? 6.5 : 8;

            if (!userWeightKg) return sum;
            return sum + MET * userWeightKg * hr;
        }, 0);

        let longestHikeKm = 0;
        for (const h of hikes) {
            const km = h.distance_m / 1000;
            longestHikeKm = Math.max(longestHikeKm, km);
        }

        let fastestHikeS = Infinity;
        let longestHikeTimeS = 0;
        for (const h of hikes) {
            if (h.duration_s > 0 && h.duration_s < fastestHikeS) fastestHikeS = h.duration_s;
            if (h.duration_s > longestHikeTimeS) longestHikeTimeS = h.duration_s;
        }
        if (!isFinite(fastestHikeS)) fastestHikeS = 0;

        return {
            distanceKmTotal,
            elevationGainTotal: Math.round(elevationGainTotal),
            mostElevationGain: Math.round(mostElevationGain),
            highestPoint: Math.round(highestPoint),
            paceStr,
            speedStr,
            caloriesBurnedTotal: Math.round(caloriesBurnedTotal),
            longestHikeKm,
            fastestHikeS,
            longestHikeTimeS,
        }
    }, [hikes, userWeight])
}