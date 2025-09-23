export const timeFormatter = () => {

    function fmtTime(s: number) {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
    }

    return {
        fmtTime,
    }
}