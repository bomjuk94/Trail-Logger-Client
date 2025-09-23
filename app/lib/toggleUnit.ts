import { unitConverter } from "./unitConverter";
import type { ToggleUnitProps } from "@/types/Units";

export const toggleUnit = ({
    weight,
    isMetric,
    setWeight,
    setIsMetric
}: ToggleUnitProps) => {

    const {
        kgToLbs,
        lbsToKg,
    } = unitConverter()

    if (!weight) return;

    const w = parseFloat(weight);
    if (Number.isNaN(w)) return;

    if (isMetric) {
        setWeight(kgToLbs(w).toFixed(1));
        setIsMetric(false);
    } else {
        setWeight(lbsToKg(w).toFixed(1));
        setIsMetric(true);
    }
}