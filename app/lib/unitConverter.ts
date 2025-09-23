export const unitConverter = () => {

    function mmToFeetInches(mm: number) {
        const totalInches = mm / 25.4;
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        return { feet, inches, label: `${feet}'${inches}"` };
    }

    function gramsToKg(g: number) {
        return (g / 1000).toFixed(1);
    }

    function gramsToLbs(g: number) {
        return (g / 453.592).toFixed(1);
    }

    function kgToLbs(kg: number) {
        return kg * 2.20462;
    }

    function lbsToKg(lbs: number) {
        return lbs / 2.20462;
    }

    function mToKm(meters: number) {
        return meters / 1000;
    }

    return {
        mmToFeetInches,
        gramsToKg,
        gramsToLbs,
        kgToLbs,
        lbsToKg,
        mToKm,
    }
}



