export const distanceFormatter = () => {

    function fmtKm(meters: number) {
        return (meters / 1000).toFixed(2);
    }

    return {
        fmtKm,
    }
}